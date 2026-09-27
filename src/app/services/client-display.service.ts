import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  buildClientDisplayName,
  extractClientIdFromDepartmentRequest,
  normalizeClientRecord,
} from '../utils/client-display.util';

@Injectable({ providedIn: 'root' })
export class ClientDisplayService {
  private readonly cache = new Map<number, ReturnType<typeof normalizeClientRecord>>();

  constructor(private api: ApiService) {}

  extractClientId(request: any): number | null {
    return extractClientIdFromDepartmentRequest(request);
  }

  getDisplayName(request: any): string {
    const clientId = typeof request === 'number' ? request : this.extractClientId(request);
    if (clientId) {
      const cached = this.cache.get(clientId);
      if (cached) {
        return buildClientDisplayName(cached);
      }
      return '';
    }
    if (request && typeof request === 'object') {
      return buildClientDisplayName(request);
    }
    return '';
  }

  clearCache(): void {
    this.cache.clear();
  }

  invalidateClient(clientId: number | string): void {
    const id = Number(clientId);
    if (Number.isFinite(id) && id > 0) {
      this.cache.delete(id);
    }
  }

  getCachedClient(clientId: number): any | null {
    return this.cache.get(clientId) ?? null;
  }

  upsertClient(raw: any): void {
    const normalized = normalizeClientRecord(raw);
    const clientId = Number(normalized.id ?? normalized.clientId);
    if (Number.isFinite(clientId) && clientId > 0) {
      this.cache.set(clientId, normalized);
    }
  }

  refreshClient(clientId: number | string): Observable<any | null> {
    const id = Number(clientId);
    if (!Number.isFinite(id) || id <= 0) {
      return of(null);
    }

    return this.api.getClientById(id).pipe(
      tap((client) => {
        if (client) {
          this.upsertClient(client);
        }
      }),
      map(() => this.getCachedClient(id)),
      catchError(() => of(null))
    );
  }

  hydrateFromRequests(requests: any[], forceRefresh = false): Observable<void> {
    const clientIds = Array.from(
      new Set(
        (requests || [])
          .map((request) => this.extractClientId(request))
          .filter((id): id is number => id != null)
      )
    );

    const idsToFetch = forceRefresh
      ? clientIds
      : clientIds.filter((id) => !this.cache.has(id));

    if (!idsToFetch.length) {
      return of(void 0);
    }

    return forkJoin(
      idsToFetch.map((id) =>
        this.api.getClientById(id).pipe(
          tap((client) => {
            if (client) {
              this.upsertClient(client);
            }
          }),
          catchError(() => of(null))
        )
      )
    ).pipe(map(() => void 0));
  }

  /** Reload all clients from the registry so department lists always show current names. */
  refreshClientDirectory(): Observable<void> {
    this.cache.clear();
    return this.api.getAllClients().pipe(
      tap((clients: any[]) => {
        (Array.isArray(clients) ? clients : []).forEach((client) => this.upsertClient(client));
      }),
      map(() => void 0),
      catchError(() => of(void 0))
    );
  }
}
