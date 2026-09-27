import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { ApiConfigService } from './api-config.service';
import { ApiService } from './api.service';

export interface MessagePushEvent {
  type: string;
  conversationId?: number;
  message?: {
    id?: number;
    messageId?: number;
    conversationId?: number;
    senderId?: number;
    text?: string;
    message?: string;
    content?: string;
    body?: string;
    createdAt?: string;
    created_at?: string;
    timestamp?: string;
  };
  conversation?: {
    id?: number;
    conversationId?: number;
    lastMessage?: string;
    lastMessageText?: string;
    lastMessageTime?: string;
    updatedAt?: string;
    unreadCount?: number;
    unread?: number;
    participantName?: string;
    participantUsername?: string;
  };
  title?: string;
  body?: string;
  route?: string;
  queueEntry?: Record<string, unknown>;
  stockAlert?: {
    itemId?: number;
    itemName?: string;
    stockAtHand?: string;
    reOrderLevel?: number;
  };
  treatmentDoseDue?: {
    chartId?: number;
    treatmentRequestedId?: number;
    visitId?: number;
    clientId?: number;
    clientName?: string;
    treatmentName?: string;
    nextDoseDate?: string;
    nextDoseTime?: string;
    totalDosagesRemaining?: number;
    dosage?: string;
    route?: string;
  };
  procedureRequest?: {
    id?: number;
    visitId?: number;
    procedureRequestedName?: string;
    category?: string;
    procedureCategoryName?: string;
    status?: string;
    clientName?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class MessagingWebSocketService implements OnDestroy {
  private ws?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempt = 0;
  private readonly maxReconnectMs = 30000;
  private intentionalClose = false;

  private readonly pushSubject = new Subject<MessagePushEvent>();
  readonly incoming$ = this.pushSubject.asObservable();

  private readonly statusSubject = new Subject<'connected' | 'disconnected'>();
  readonly status$ = this.statusSubject.asObservable();

  constructor(
    private apiConfig: ApiConfigService,
    private api: ApiService
  ) {
    this.apiConfig.state$.subscribe((state) => {
      if (state === 'ready' && !this.intentionalClose) {
        this.connect();
      }
    });
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const token = this.api.getSessionToken();
    if (!token || !this.apiConfig.isReady()) {
      return;
    }

    this.intentionalClose = false;
    const httpBase = this.apiConfig.getBaseUrl().replace(/\/+$/, '');
    const wsBase = httpBase.startsWith('https://')
      ? `wss://${httpBase.substring('https://'.length)}`
      : httpBase.startsWith('http://')
        ? `ws://${httpBase.substring('http://'.length)}`
        : `ws://${httpBase}`;
    const url = `${wsBase}/messages/ws?token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.statusSubject.next('connected');
      console.info('[MessagingWS] connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data)) as MessagePushEvent;
        if (data?.type) {
          this.pushSubject.next(data);
        }
      } catch {
        /* ignore malformed payloads */
      }
    };

    this.ws.onclose = () => {
      this.statusSubject.next('disconnected');
      this.ws = undefined;
      if (!this.intentionalClose) {
        console.warn('[MessagingWS] disconnected — reconnecting');
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.pushSubject.complete();
    this.statusSubject.complete();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.intentionalClose) {
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), this.maxReconnectMs);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delay);
  }
}
