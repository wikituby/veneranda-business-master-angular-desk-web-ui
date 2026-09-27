import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ClientWeightVitalsService {
  constructor(private api: ApiService) {}

  saveWeightForVisit(visitId: number, weightKg: number): Observable<number> {
    const weight = Number(weightKg);
    if (!Number.isFinite(visitId) || visitId <= 0 || !Number.isFinite(weight) || weight <= 0) {
      throw new Error('Enter a valid weight in kg.');
    }

    return this.api.getInitialVitalsByVisit(visitId).pipe(
      switchMap((res: any) => {
        const vitals = Array.isArray(res) ? res : res?.data ?? [];
        const latest = this.pickLatestVital(vitals);
        const payload = this.buildWeightPayload(weight, latest);
        if (latest?.id != null) {
          return this.api.updateVital(Number(latest.id), payload).pipe(map(() => weight));
        }
        return this.api.takeVitals(visitId, payload).pipe(map(() => weight));
      }),
      catchError(() => {
        const payload = this.buildWeightPayload(weight, null);
        return this.api.takeVitals(visitId, payload).pipe(map(() => weight));
      })
    );
  }

  private pickLatestVital(vitals: any[]): any | null {
    const candidates = (Array.isArray(vitals) ? vitals : [])
      .filter((vital) => vital != null)
      .map((vital) => ({
        vital,
        timestamp: this.vitalTimestamp(vital),
        id: Number(vital?.id),
      }));

    if (!candidates.length) {
      return null;
    }

    candidates.sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return b.timestamp - a.timestamp;
      }
      return (Number.isFinite(b.id) ? b.id : 0) - (Number.isFinite(a.id) ? a.id : 0);
    });

    return candidates[0].vital;
  }

  private vitalTimestamp(vital: any): number {
    const dateValue = String(vital?.dateTaken || '').trim();
    const timeValue = String(vital?.timeTaken || '').trim();
    const combined = [dateValue, timeValue].filter(Boolean).join('T');
    const parsed = combined ? Date.parse(combined) : NaN;
    if (Number.isFinite(parsed)) {
      return parsed;
    }
    const fallback = Date.parse(String(vital?.createdAt || vital?.createdDate || ''));
    return Number.isFinite(fallback) ? fallback : 0;
  }

  private buildWeightPayload(weightKg: number, existing: any | null): any {
    const now = new Date();
    const takenBy = this.resolveTakenBy();

    if (existing) {
      return {
        temperature: existing.temperature ?? null,
        diastolic: existing.diastolic ?? null,
        systolic: existing.systolic ?? null,
        pulseRate: existing.pulseRate ?? null,
        spO2: existing.spO2 ?? null,
        heartRate: existing.heartRate ?? null,
        respiratoryRate: existing.respiratoryRate ?? null,
        height: existing.height ?? null,
        muac: existing.muac ?? null,
        weight: weightKg,
        dateTaken: this.formatDateForVitalsApi(existing.dateTaken, now),
        timeTaken: this.formatTimeForVitalsApi(existing.timeTaken, now),
        station: existing.station || 'Triage',
        takenBy: existing.takenBy || takenBy,
      };
    }

    return {
      temperature: null,
      diastolic: null,
      systolic: null,
      pulseRate: null,
      spO2: null,
      heartRate: null,
      respiratoryRate: null,
      height: null,
      muac: null,
      weight: weightKg,
      dateTaken: this.formatDateForVitalsApi(null, now),
      timeTaken: this.formatTimeForVitalsApi(null, now),
      station: 'Triage',
      takenBy,
    };
  }

  private formatDateForVitalsApi(value: unknown, fallback: Date): string {
    if (value && typeof value === 'object' && value !== null && 'year' in (value as any)) {
      const v = value as { year: number; month: number; day: number };
      return `${v.year}/${String(v.month).padStart(2, '0')}/${String(v.day).padStart(2, '0')}`;
    }
    if (typeof value === 'string' && value.trim()) {
      const normalized = value.trim().replace(/-/g, '/');
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(normalized)) {
        return normalized;
      }
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return `${parsed.getFullYear()}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${String(parsed.getDate()).padStart(2, '0')}`;
      }
    }
    return `${fallback.getFullYear()}/${String(fallback.getMonth() + 1).padStart(2, '0')}/${String(fallback.getDate()).padStart(2, '0')}`;
  }

  private formatTimeForVitalsApi(value: unknown, fallback: Date): string {
    if (typeof value === 'string' && value.trim()) {
      const parts = value.trim().split(':');
      if (parts.length >= 2) {
        const h = String(Number(parts[0])).padStart(2, '0');
        const m = String(Number(parts[1])).padStart(2, '0');
        const s = parts.length > 2 ? String(Number(parts[2])).padStart(2, '0') : '00';
        return `${h}:${m}:${s}`;
      }
    }
    return `${String(fallback.getHours()).padStart(2, '0')}:${String(fallback.getMinutes()).padStart(2, '0')}:${String(fallback.getSeconds()).padStart(2, '0')}`;
  }

  private resolveTakenBy(): string {
    const username = sessionStorage.getItem('username');
    if (username?.trim()) {
      return username.trim();
    }
    const userDetailsStr = sessionStorage.getItem('userDetails');
    if (userDetailsStr) {
      try {
        const userDetails = JSON.parse(userDetailsStr);
        const name = userDetails?.username ?? userDetails?.userName;
        if (name) {
          return String(name);
        }
      } catch {
        /* ignore malformed session data */
      }
    }
    return 'Nurse';
  }
}
