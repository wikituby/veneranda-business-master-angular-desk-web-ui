import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { SubscriptionService } from './subscription.service';

export type HeaderNotificationKind = 'stock' | 'queue' | 'subscription';

export interface HeaderNotification {
  id: string;
  kind: HeaderNotificationKind;
  title: string;
  message: string;
  timeLabel?: string;
  route?: string;
  icon: string;
  tone: 'info' | 'warning' | 'urgent';
}

const STOCK_LIMIT = 6;
const QUEUE_LIMIT = 8;
const QUEUE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class HeaderNotificationService {
  constructor(
    private api: ApiService,
    private subscription: SubscriptionService
  ) {}

  /** Subscription expiry only — no HTTP calls (for header badge without polling). */
  getLocalNotifications(): HeaderNotification[] {
    return this.buildSubscriptionNotifications();
  }

  fetchNotifications(options: {
    includeStock: boolean;
    includeQueue: boolean;
    includeSubscription: boolean;
  }): Observable<HeaderNotification[]> {
    const subscriptionNotes = options.includeSubscription
      ? this.buildSubscriptionNotifications()
      : [];

    const stock$ = options.includeStock
      ? this.api.getItemsForReOrder().pipe(
          map((items) => this.buildStockNotifications(items)),
          catchError(() => of([] as HeaderNotification[]))
        )
      : of([] as HeaderNotification[]);

    const queue$ = options.includeQueue
      ? this.api.getLatestClientQueueEntries(20, 'current', null).pipe(
          map((entries) => this.buildQueueNotifications(entries)),
          catchError(() => of([] as HeaderNotification[]))
        )
      : of([] as HeaderNotification[]);

    return forkJoin({ stock: stock$, queue: queue$ }).pipe(
      map(({ stock, queue }) =>
        this.sortNotifications([...subscriptionNotes, ...stock, ...queue])
      )
    );
  }

  private sortNotifications(list: HeaderNotification[]): HeaderNotification[] {
    const toneRank: Record<HeaderNotification['tone'], number> = {
      urgent: 0,
      warning: 1,
      info: 2,
    };
    return [...list].sort(
      (a, b) => toneRank[a.tone] - toneRank[b.tone] || a.title.localeCompare(b.title)
    );
  }

  private buildSubscriptionNotifications(): HeaderNotification[] {
    const info = this.subscription.getExpiryWarningInfo();
    if (!info?.showWarning) {
      return [];
    }
    const endLabel = this.subscription.formatPeriodEndDate(info.periodEnd);
    return [
      {
        id: 'subscription-expiry',
        kind: 'subscription',
        title: info.message,
        message: `${info.remainingLabel} remaining · expires ${endLabel}`,
        route: '/overview/subscription',
        icon: 'bi-calendar-x',
        tone: info.urgent ? 'urgent' : 'warning',
      },
    ];
  }

  private buildStockNotifications(items: any): HeaderNotification[] {
    const list = Array.isArray(items) ? items : [];
    const low = list.slice(0, STOCK_LIMIT);
    const notes: HeaderNotification[] = low.map((item, index) => {
      const name =
        item?.itemName ||
        item?.stockItemName ||
        item?.name ||
        item?.description ||
        `Item #${item?.id ?? index + 1}`;
      const qty =
        item?.stockAtHand ??
        item?.quantityOnHand ??
        item?.availableQuantity ??
        item?.qty;
      const reorder =
        item?.reOrderLevel ??
        item?.reorderLevel ??
        item?.reOrderTo ??
        item?.reorderTo;
      const qtyPart =
        qty != null && reorder != null
          ? `Stock ${qty} (reorder at ${reorder})`
          : qty != null
            ? `Stock on hand: ${qty}`
            : 'Below reorder level';
      return {
        id: `stock-${item?.id ?? item?.stockItemId ?? index}`,
        kind: 'stock',
        title: 'Low stock alert',
        message: `${name} — ${qtyPart}`,
        route: '/overview/reorder-levels',
        icon: 'bi-box-seam',
        tone: 'warning',
      };
    });
    if (list.length > STOCK_LIMIT) {
      notes.push({
        id: 'stock-more',
        kind: 'stock',
        title: 'More stock alerts',
        message: `${list.length - STOCK_LIMIT} additional item(s) below reorder level`,
        route: '/overview/reorder-levels',
        icon: 'bi-exclamation-triangle',
        tone: 'warning',
      });
    }
    return notes;
  }

  private buildQueueNotifications(entries: any): HeaderNotification[] {
    const list = Array.isArray(entries) ? entries : [];
    const cutoff = Date.now() - QUEUE_MAX_AGE_MS;
    const waiting = list
      .filter((e) => {
        const status = String(e?.status || 'WAITING').toUpperCase();
        if (status !== 'WAITING' && status !== 'CALLED') {
          return false;
        }
        const t = this.queueTimeMs(e?.queuedAt);
        return t >= cutoff;
      })
      .slice(0, QUEUE_LIMIT);

    return waiting.map((e, index) => {
      const name =
        `${e?.clientSurname || ''} ${e?.clientOtherNames || ''}`.trim() ||
        e?.clientName ||
        'Client';
      const dest = e?.toModuleName || 'queue';
      const from = e?.fromModuleName ? ` from ${e.fromModuleName}` : '';
      const qNo = e?.queueNumber ? `#${e.queueNumber} ` : '';
      return {
        id: `queue-${e?.id ?? index}`,
        kind: 'queue',
        title: 'Client added to queue',
        message: `${qNo}${name} → ${dest}${from}`,
        timeLabel: this.formatRelativeTime(e?.queuedAt),
        route: '/overview/queue-management',
        icon: 'bi-person-plus',
        tone: e?.emergency ? 'urgent' : 'info',
      };
    });
  }

  private queueTimeMs(value: any): number {
    if (value == null || value === '') {
      return 0;
    }
    if (Array.isArray(value) && value.length >= 3) {
      const y = Number(value[0]);
      const mo = Number(value[1]);
      const d = Number(value[2]);
      const h = value.length > 3 ? Number(value[3]) : 0;
      const mi = value.length > 4 ? Number(value[4]) : 0;
      return new Date(y, mo - 1, d, h, mi).getTime();
    }
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? 0 : t;
  }

  private formatRelativeTime(value: any): string {
    const t = this.queueTimeMs(value);
    if (!t) {
      return '';
    }
    const diff = Date.now() - t;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 1) {
      return 'Just now';
    }
    if (minutes < 60) {
      return `${minutes}m ago`;
    }
    if (hours < 24) {
      return `${hours}h ago`;
    }
    return new Date(t).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
