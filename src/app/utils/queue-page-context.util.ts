import { HEADER_DEPARTMENT_LINKS } from '../config/header-department-links';
import { findAppAccessPage } from '../config/app-access-pages';

/** Hospital module row from API (subset used for route matching). */
export type QueueRouteModule = {
  id?: number;
  code?: string;
  name?: string;
  routeKey?: string;
};

export type PageWorkContext = {
  moduleId: number | null;
  /** Hospital module / department name for the current page. */
  departmentLabel: string;
  /** Friendly page name when there is no hospital module (e.g. Registry, Help). */
  pageLabel: string;
};

function norm(s: unknown): string {
  return String(s ?? '').trim().toLowerCase();
}

function pathOnly(url: string): string {
  return String(url ?? '').split('?')[0].split('#')[0];
}

export function isPharmacyModule(mod: QueueRouteModule | null | undefined): boolean {
  if (!mod) {
    return false;
  }
  const code = norm(mod.code).toUpperCase();
  const routeKey = norm(mod.routeKey);
  const name = norm(mod.name);
  return (
    code === 'PHARMACY' ||
    routeKey === 'pharmacy' ||
    routeKey === 'otc-dispensary' ||
    name.includes('pharmacy')
  );
}

function findModule(
  list: QueueRouteModule[],
  predicate: (m: QueueRouteModule) => boolean
): QueueRouteModule | undefined {
  return list.find(predicate);
}

function toModuleId(mod: QueueRouteModule | undefined): number | null {
  if (mod?.id == null) {
    return null;
  }
  const n = Number(mod.id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function findByPageKey(list: QueueRouteModule[], pageKey: string): QueueRouteModule | undefined {
  const key = norm(pageKey);
  return findModule(list, (m) => {
    const rk = norm(m.routeKey);
    const code = norm(m.code);
    const name = norm(m.name);
    return (
      rk === key ||
      code === key ||
      code === key.toUpperCase() ||
      (key.length > 2 && name.includes(key.replace(/-/g, ' ')))
    );
  });
}

function findLabModule(list: QueueRouteModule[]): QueueRouteModule | undefined {
  return findModule(
    list,
    (m) =>
      norm(m.routeKey) === 'lab' ||
      norm(m.code).toUpperCase() === 'LAB' ||
      norm(m.name).includes('laboratory') ||
      norm(m.name).includes('lab ')
  );
}

function findScanModule(list: QueueRouteModule[]): QueueRouteModule | undefined {
  return findModule(
    list,
    (m) =>
      norm(m.routeKey) === 'scan' ||
      norm(m.code).toUpperCase() === 'SCAN' ||
      norm(m.name).includes('ultrasound') ||
      norm(m.name).includes('radiolog') ||
      norm(m.name).includes('scan')
  );
}

function findConsultationModule(list: QueueRouteModule[]): QueueRouteModule | undefined {
  return findModule(list, (m) => {
    const rk = norm(m.routeKey);
    const code = norm(m.code).toUpperCase();
    return (
      rk === 'client-visit' ||
      rk === 'consultations-center' ||
      rk === 'consultation' ||
      rk === 'triage' ||
      code === 'CONSULTATION' ||
      code === 'TRIAGE' ||
      norm(m.name).includes('consultation') ||
      norm(m.name).includes('triage')
    );
  });
}

function findFinanceModule(list: QueueRouteModule[]): QueueRouteModule | undefined {
  const byKey = findByPageKey(list, 'dashboard');
  if (byKey) {
    return byKey;
  }
  return findModule(
    list,
    (m) =>
      norm(m.code).toUpperCase() === 'FINANCE' ||
      norm(m.name).includes('financial') ||
      norm(m.name).includes('balance sheet')
  );
}

/** Overview path segment → hospital module hints. */
const OVERVIEW_SEGMENT_MODULE: Record<string, (list: QueueRouteModule[]) => QueueRouteModule | undefined> = {
  'lab-dashboard': findLabModule,
  'lab-test-requests': findLabModule,
  'sample-collection': findLabModule,
  'test-processing': findLabModule,
  'lab-results': findLabModule,
  'lab-reports': findLabModule,
  'lab-equipment-tracking': findLabModule,
  'lab-statistics': findLabModule,
  'scan-requests': findScanModule,
  'radiology-reports': findScanModule,
  'pacs-integration': findScanModule,
  'radiologist-worklist': findScanModule,
  'otc-dispensary': (list) => findModule(list, isPharmacyModule),
  'pharmacy-dispensing': (list) => findModule(list, isPharmacyModule),
  'pharmacy-prescription-management': (list) => findModule(list, isPharmacyModule),
  'pharmacy-pricing': (list) => findModule(list, isPharmacyModule),
  'pharmacy-purchase-orders': (list) => findModule(list, isPharmacyModule),
  'pharmacy-expiry-alerts': (list) => findModule(list, isPharmacyModule),
  'pharmacy-suppliers': (list) => findModule(list, isPharmacyModule),
  'drug-utilization': (list) => findModule(list, isPharmacyModule),
  'opd-consultation': findConsultationModule,
  'opd-prescriptions': findConsultationModule,
  'opd-investigations': findConsultationModule,
  'opd-diagnosis': findConsultationModule,
  'opd-follow-ups': findConsultationModule,
  'client-billing': findFinanceModule,
  'expenses': findFinanceModule,
  'finance-dashboard': findFinanceModule,
  'finance-reports': findFinanceModule,
  'cashier': findFinanceModule,
  'service-charges': findFinanceModule,
  'insurance-billing': findFinanceModule,
  'refunds': findFinanceModule,
  'dental': (list) => findByPageKey(list, 'dental'),
  'maternal-child-health-requests': (list) =>
    findByPageKey(list, 'maternal-child-health-requests'),
};

const STANDALONE_ROUTE_PAGE_KEYS: Record<string, string> = {
  '/messages': 'messages',
  '/overview/messages': 'messages',
  '/help': 'help',
};

/**
 * Resolve the hospital module (department) for the page currently open.
 * Used so queue lists only clients sent to that department (toModule).
 */
export function resolveModuleIdForUrl(
  url: string,
  modules: QueueRouteModule[]
): number | null {
  const ctx = resolvePageContextFromUrl(url, modules);
  return ctx.moduleId;
}

function labelFromHeaderLink(path: string): string {
  for (const link of HEADER_DEPARTMENT_LINKS) {
    if (path === link.path || path.startsWith(`${link.path}/`)) {
      return link.label;
    }
  }
  return '';
}

function labelFromOverviewSegment(segment: string): string {
  const page = findAppAccessPage(segment);
  if (page?.label) {
    return page.label;
  }
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Full page context for header dept/room display and queue scoping.
 */
export function resolvePageContextFromUrl(
  url: string,
  modules: QueueRouteModule[]
): PageWorkContext {
  const list = Array.isArray(modules) ? modules : [];
  const path = pathOnly(url);
  let moduleId: number | null = null;
  let departmentLabel = '';

  if (list.length > 0) {
    for (const link of HEADER_DEPARTMENT_LINKS) {
      if (path === link.path || path.startsWith(`${link.path}/`)) {
        const mod = findByPageKey(list, link.pageKey);
        moduleId = toModuleId(mod);
        departmentLabel = mod?.name || link.label;
        if (moduleId != null) {
          return { moduleId, departmentLabel, pageLabel: departmentLabel };
        }
      }
    }

    if (path.includes('client-visit')) {
      const visitMod = findConsultationModule(list);
      moduleId = toModuleId(visitMod);
      departmentLabel =
        visitMod?.name || labelFromOverviewSegment('client-visit') || 'Consultation';
      return {
        moduleId,
        departmentLabel,
        pageLabel: departmentLabel,
      };
    }

    const parts = path.split('/').filter(Boolean);
    const overviewIdx = parts.indexOf('overview');
    if (overviewIdx >= 0 && parts.length > overviewIdx + 1) {
      const segment = parts[overviewIdx + 1];
      const seg = norm(segment);

      const segmentResolver = OVERVIEW_SEGMENT_MODULE[segment];
      if (segmentResolver) {
        const mod = segmentResolver(list);
        moduleId = toModuleId(mod);
        if (mod?.name) {
          departmentLabel = mod.name;
        }
      }

      if (moduleId == null && (seg.includes('pharmacy') || seg.includes('otc'))) {
        const pharmacy = findModule(list, isPharmacyModule);
        moduleId = toModuleId(pharmacy);
        departmentLabel = pharmacy?.name || 'POS';
      }

      if (moduleId == null) {
        const exact = findModule(list, (m) => norm(m.routeKey) === seg);
        moduleId = toModuleId(exact);
        if (exact?.name) {
          departmentLabel = exact.name;
        }
      }

      if (moduleId == null) {
        const prefix = findModule(list, (m) => {
          const rk = norm(m.routeKey);
          return rk.length > 0 && (seg.startsWith(rk) || rk.startsWith(seg));
        });
        moduleId = toModuleId(prefix);
        if (prefix?.name) {
          departmentLabel = prefix.name;
        }
      }

      const pageLabel = labelFromOverviewSegment(segment);
      if (!departmentLabel) {
        departmentLabel = pageLabel;
      }
      return { moduleId, departmentLabel, pageLabel };
    }
  }

  const standaloneKey = STANDALONE_ROUTE_PAGE_KEYS[path];
  if (standaloneKey) {
    const page = findAppAccessPage(standaloneKey);
    const pageLabel = page?.label || standaloneKey.replace(/-/g, ' ');
    return { moduleId: null, departmentLabel: pageLabel, pageLabel };
  }

  const headerLabel = labelFromHeaderLink(path);
  if (headerLabel) {
    return { moduleId: null, departmentLabel: headerLabel, pageLabel: headerLabel };
  }

  return { moduleId: null, departmentLabel: '', pageLabel: '' };
}

/** Build header summary text from department and optional room. */
export function buildWorkContextSummary(
  departmentLabel: string,
  roomName: string
): string {
  const dept = (departmentLabel || '').trim();
  const room = (roomName || '').trim();
  const parts: string[] = [];
  if (dept) {
    parts.push(`Dept: ${dept}`);
  }
  if (room) {
    parts.push(`Room: ${room}`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'No department or room';
}

/** Persist active department for queue API scope (single department = current page). */
export function applyQueuePageModuleToSession(moduleId: number | null): void {
  if (moduleId != null && moduleId > 0) {
    sessionStorage.setItem('activeModuleId', String(moduleId));
    sessionStorage.setItem('queuePageModuleId', String(moduleId));
  }
}

export function getQueuePageModuleIdFromSession(): number | null {
  const raw =
    sessionStorage.getItem('queuePageModuleId') ||
    sessionStorage.getItem('activeModuleId') ||
    '';
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}
