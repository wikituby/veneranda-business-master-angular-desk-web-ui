import { getQueuePageModuleIdFromSession } from './queue-page-context.util';

/** Sentinel value for the discharge option in queue destination selects. */
export const QUEUE_DISCHARGE_DESTINATION_ID = -1;

export function isQueueDischargeDestination(toModuleId: number | null | undefined): boolean {
  return Number(toModuleId) === QUEUE_DISCHARGE_DESTINATION_ID;
}

export function queueDestinationOptions(modules: any[]): any[] {
  const list = Array.isArray(modules) ? modules : [];
  return [...list, { id: QUEUE_DISCHARGE_DESTINATION_ID, name: 'Discharge', code: 'DISCHARGE' }];
}

/** Normalize hospital module rows for queue select [ngValue] binding. */
export function normalizeBusinessModules(res: unknown): any[] {
  const list = Array.isArray(res) ? res : [];
  return list
    .filter((m: any) => m?.active !== false)
    .map((m: any) => ({ ...m, id: Number(m.id) }))
    .filter((m: any) => Number.isFinite(m.id) && m.id > 0);
}

/** Default "From" department: current page module, then consultation, reception, first module. */
export function pickDefaultFromModuleId(modules: any[], preferredId?: number | null): number | null {
  const list = Array.isArray(modules) ? modules : [];
  if (!list.length) {
    return null;
  }
  const pageId = preferredId ?? getQueuePageModuleIdFromSession();
  if (pageId != null && list.some((m) => m.id === pageId)) {
    return pageId;
  }
  const consultation = list.find(
    (m) =>
      String(m?.code || '').toUpperCase() === 'CONSULTATION' ||
      String(m?.name || '').toLowerCase().includes('consultation')
  );
  const reception = list.find(
    (m) =>
      String(m?.code || '').toUpperCase() === 'RECEPTION' ||
      String(m?.name || '').toLowerCase().includes('reception')
  );
  return consultation?.id ?? reception?.id ?? list[0]?.id ?? null;
}

/** Keep ngModel in sync when the stored id is missing from the option list. */
export function ensureFromModuleInList(
  fromModuleId: number | null,
  modules: any[],
  preferredId?: number | null
): number | null {
  const list = Array.isArray(modules) ? modules : [];
  if (!list.length) {
    return null;
  }
  if (fromModuleId != null && list.some((m) => m.id === fromModuleId)) {
    return fromModuleId;
  }
  return pickDefaultFromModuleId(list, preferredId);
}
