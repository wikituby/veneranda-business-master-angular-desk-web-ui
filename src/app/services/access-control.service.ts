import { Injectable } from '@angular/core';
import {
  APP_ACCESS_PAGES,
  AppAccessPage,
  findAppAccessPage,
  getAppAccessPagesByGroup,
  TOP_LEVEL_ACCESS_PAGE_KEYS,
} from '../config/app-access-pages';
import {
  APP_ACCESS_ENDPOINTS,
  AppAccessEndpoint,
  getAppAccessEndpointsByGroup,
} from '../config/app-access-endpoints';
import {
  APP_ACCESS_COMPONENTS,
  AppAccessComponent,
  componentFullKey,
  findAppAccessComponent,
  getAppAccessComponentsForPage,
} from '../config/app-access-components';
import { getAllUserRoles } from '../utils/user-roles.util';

export interface PageComponentAccessContext {
  orderAgeHours?: number;
}

@Injectable({ providedIn: 'root' })
export class AccessControlService {
  private loaded = false;
  private restricted = false;
  private allowedPages = new Set<string>();
  private hiddenComponents = new Set<string>();

  /** Explicit full-access token persisted from Access Control panel. */
  static readonly FULL_ACCESS_TOKEN = '*';

  isFullAccessCsv(csv: any): boolean {
    const raw = String(csv ?? '').trim();
    if (!raw) {
      return true; // legacy empty = unrestricted
    }
    return (
      raw === AccessControlService.FULL_ACCESS_TOKEN ||
      raw
        .split(',')
        .map((s) => s.trim())
        .includes(AccessControlService.FULL_ACCESS_TOKEN)
    );
  }

  refreshFromSession(): void {
    this.loaded = true;
    this.hiddenComponents = this.parseHiddenComponentsCsv(
      sessionStorage.getItem('hiddenPageComponents') || ''
    );
    if (this.isAdminRole()) {
      this.restricted = false;
      this.allowedPages = new Set();
      return;
    }
    const raw = sessionStorage.getItem('allowedPageRoutes') || '';
    if (this.isFullAccessCsv(raw)) {
      this.restricted = false;
      this.allowedPages = new Set();
      return;
    }
    this.restricted = true;
    this.allowedPages = new Set(
      raw.split(',').map(s => s.trim()).filter(Boolean)
    );
    this.allowedPages.add('main-dashboard');
  }

  clearSessionCache(): void {
    this.loaded = false;
    this.restricted = false;
    this.allowedPages = new Set();
    this.hiddenComponents = new Set();
  }

  canAccessPage(key: string | null | undefined): boolean {
    if (!key) {
      return true;
    }
    this.ensureLoaded();
    const page = findAppAccessPage(key);
    if (page?.enabled === false) {
      return false;
    }
    if (page?.adminOnly) {
      return this.isPrivilegedRole();
    }
    if (this.isAdminRole()) {
      return true;
    }
    if (!this.restricted) {
      return true;
    }
    if (key === 'consultations-center') {
      return (
        this.allowedPages.has('consultations-center') ||
        this.allowedPages.has('client-visit') ||
        this.allowedPages.has('consultation-v2') ||
        this.allowedPages.has('clienttransactions')
      );
    }
    if (key === 'consultation-v2' || key === 'clienttransactions') {
      return (
        this.allowedPages.has('consultation-v2') ||
        this.allowedPages.has('clienttransactions') ||
        this.allowedPages.has('consultations-center') ||
        this.allowedPages.has('client-visit')
      );
    }
    if (key === 'client-visit') {
      return (
        this.allowedPages.has('client-visit') ||
        this.allowedPages.has('consultations-center') ||
        this.allowedPages.has('consultation-v2') ||
        this.allowedPages.has('clienttransactions')
      );
    }
    return this.allowedPages.has(key);
  }

  isUserRestricted(): boolean {
    this.ensureLoaded();
    return this.restricted && !this.isAdminRole();
  }

  isAdminRole(role?: string): boolean {
    if (role != null) {
      return role.toLowerCase().trim() === 'admin';
    }
    return this.getAllRoles().some((r) => r === 'admin');
  }

  isPrivilegedRole(role?: string): boolean {
    if (role != null) {
      const r = role.toLowerCase().trim();
      return r === 'admin' || r === 'md';
    }
    return this.getAllRoles().some((r) => r === 'admin' || r === 'md');
  }

  /** All assigned roles (primary + secondary), lowercased. */
  getAllRoles(): string[] {
    return getAllUserRoles().map((r) => r.toLowerCase().trim()).filter(Boolean);
  }

  canManageAccessControl(): boolean {
    return this.isPrivilegedRole();
  }

  /** Full client-visit workspace (all tabs), not pharmacy dispense-only view. */
  canUseFullClientVisitWorkspace(): boolean {
    this.ensureLoaded();
    if (this.isAdminRole()) {
      return true;
    }
    if (!this.restricted) {
      return true;
    }
    return (
      this.allowedPages.has('client-visit') ||
      this.allowedPages.has('consultations-center')
    );
  }

  /** Re-open a closed client order. Admin/MD, Access Control key, or Business Settings privilege. */
  canOpenClosedVisit(): boolean {
    this.ensureLoaded();
    if (this.isPrivilegedRole()) {
      return true;
    }
    if (this.currentUserHasSpecialPrivilege('openVisit')) {
      return true;
    }
    return this.allowedPages.has('open-closed-visit');
  }

  /** Add / assign clients to debt-permitted groups (incl. Veneranda Hospital). */
  canAddVenerandaMedicalClient(): boolean {
    if (this.isPrivilegedRole()) {
      return true;
    }
    return this.currentUserHasSpecialPrivilege('venerandaGroup');
  }

  /** Grant client groups the right to incur debt despite unpaid balances. */
  canManageCreditGroupRights(): boolean {
    if (this.isPrivilegedRole()) {
      return true;
    }
    return this.currentUserHasSpecialPrivilege('creditGroup');
  }

  /** True when the group name is the reserved Veneranda Business group. */
  isVenerandaMedicalGroup(group: { groupName?: string; name?: string } | string | null | undefined): boolean {
    const name =
      typeof group === 'string'
        ? group
        : group?.groupName || (group as { name?: string } | null | undefined)?.name || '';
    const normalized = String(name).trim().toLowerCase();
    return normalized === 'veneranda hospital' || normalized === 'veneranda medical';
  }

  /** Groups configured in Special Privileges for multi-visit debt. */
  isDebtPermittedGroup(
    group: { id?: number; groupName?: string; name?: string; allowsCreditDespiteUnpaidBalance?: boolean } | null | undefined
  ): boolean {
    if (!group) {
      return false;
    }
    if (group.allowsCreditDespiteUnpaidBalance === true) {
      return true;
    }
    if (this.isVenerandaMedicalGroup(group)) {
      return true;
    }
    const id = Number(group.id);
    if (!Number.isFinite(id) || id <= 0) {
      return false;
    }
    try {
      const branding =
        this.readPrivilegeCsvFromBrandingCache('privilegeCreditAllowedGroupIds') || '';
      return branding
        .split(',')
        .map((s) => Number(String(s).trim()))
        .some((gid) => gid === id);
    } catch {
      return false;
    }
  }

  /** Whether the current user may assign a client to this group. */
  canAssignClientToGroup(
    group: { id?: number; groupName?: string; name?: string; allowsCreditDespiteUnpaidBalance?: boolean } | null | undefined
  ): boolean {
    if (!group || !this.isDebtPermittedGroup(group)) {
      return true;
    }
    return this.canAddVenerandaMedicalClient();
  }

  /** Filter out debt-permitted groups when the user lacks that privilege. */
  filterAssignableClientGroups<
    T extends { id?: number; groupName?: string; name?: string; allowsCreditDespiteUnpaidBalance?: boolean }
  >(groups: T[] | null | undefined): T[] {
    const list = Array.isArray(groups) ? groups : [];
    if (this.canAddVenerandaMedicalClient()) {
      return list;
    }
    return list.filter((g) => !this.isDebtPermittedGroup(g));
  }

  private currentUserHasSpecialPrivilege(
    kind: 'openVisit' | 'venerandaGroup' | 'creditGroup'
  ): boolean {
    const userId = Number(sessionStorage.getItem('userid') || sessionStorage.getItem('userId') || 0);
    if (!Number.isFinite(userId) || userId <= 0) {
      return false;
    }
    try {
      const raw = sessionStorage.getItem('facilityBranding') || localStorage.getItem('facilityBranding');
      // Facility branding may be under FacilityBrandingService storage keys — read via getters below.
    } catch {
      /* ignore */
    }
    // Lazy import avoided — AccessControlService injects FacilityBrandingService? Prefer reading session keys set by branding.
    const csvKey =
      kind === 'openVisit'
        ? 'privilegeOpenVisitUserIds'
        : kind === 'venerandaGroup'
          ? 'privilegeVenerandaGroupUserIds'
          : 'privilegeCreditGroupUserIds';
    const csv =
      sessionStorage.getItem(csvKey) ||
      this.readPrivilegeCsvFromBrandingCache(csvKey);
    if (!csv?.trim()) {
      return false;
    }
    return csv
      .split(',')
      .map((s) => Number(String(s).trim()))
      .some((id) => id === userId);
  }

  private readPrivilegeCsvFromBrandingCache(key: string): string {
    try {
      const raw =
        sessionStorage.getItem('facilityBranding') ||
        localStorage.getItem('facilityBrandingLocal') ||
        localStorage.getItem('facilityBranding');
      if (!raw) {
        return '';
      }
      const data = JSON.parse(raw);
      return String(data?.[key] ?? '');
    } catch {
      return '';
    }
  }

  /** Pharmacist role limited to dispense-only UI on client order. */
  isPharmacistDispenseOnlyMode(): boolean {
    const roles = this.getAllRoles();
    const isPharm = roles.includes('pharmacist') || roles.includes('pharmacy');
    if (!isPharm) {
      return false;
    }
    if (this.isPrivilegedRole()) {
      return false;
    }
    if (roles.some((r) => ['doctor', 'clinician', 'nurse', 'md', 'admin'].includes(r))) {
      return false;
    }
    return !this.canUseFullClientVisitWorkspace();
  }

  getManageableComponents(): AppAccessComponent[] {
    return [...APP_ACCESS_COMPONENTS];
  }

  getComponentsForPage(pageKey: string): AppAccessComponent[] {
    const manageablePages = new Set(this.getManageablePages().map((p) => p.key));
    if (!manageablePages.has(pageKey)) {
      return [];
    }
    return getAppAccessComponentsForPage(pageKey);
  }

  parseHiddenComponentsCsv(csv: any): Set<string> {
    if (!csv || typeof csv !== 'string') {
      return new Set();
    }
    const valid = new Set(
      APP_ACCESS_COMPONENTS.map((c) => componentFullKey(c.pageKey, c.key))
    );
    return new Set(
      csv
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && valid.has(s))
    );
  }

  hiddenComponentsToCsv(keys: Iterable<string>): string {
    const valid = new Set(
      APP_ACCESS_COMPONENTS.map((c) => componentFullKey(c.pageKey, c.key))
    );
    const normalized = Array.from(
      new Set(Array.from(keys).map((k) => k.trim()).filter((k) => valid.has(k)))
    );
    return normalized.join(',');
  }

  isComponentFrozen(pageKey: string, componentKey: string): boolean {
    this.ensureLoaded();
    return this.hiddenComponents.has(componentFullKey(pageKey, componentKey));
  }

  /**
   * Whether a page sub-component is visible for the current user.
   * Frozen components stay hidden; some support a time-based partial hide (see catalog).
   * Note: the admin role always sees components; test restrictions as a non-admin user.
   */
  canViewPageComponent(
    pageKey: string,
    componentKey: string,
    context?: PageComponentAccessContext
  ): boolean {
    this.ensureLoaded();
    if (this.isAdminRole()) {
      return true;
    }
    const resolvedPageKey = pageKey === 'clienttransactions' ? 'consultation-v2' : pageKey;
    if (this.restricted && !this.canAccessPage(resolvedPageKey)) {
      return false;
    }
    const fullKey = componentFullKey(resolvedPageKey, componentKey);
    if (!this.hiddenComponents.has(fullKey)) {
      return true;
    }
    const def = findAppAccessComponent(resolvedPageKey, componentKey);
    if (
      def?.hideAfterOrderAgeHours != null &&
      context?.orderAgeHours != null &&
      Number.isFinite(context.orderAgeHours)
    ) {
      return context.orderAgeHours < def.hideAfterOrderAgeHours;
    }
    return false;
  }

  static readonly UNAUTHORIZED_MESSAGE =
    'You are not authorised to view content on this page. Contact admin for permission.';

  hiddenComponentCountForPage(pageKey: string): number {
    return this.getComponentsForPage(pageKey).filter((c) =>
      this.isComponentFrozen(pageKey, c.key)
    ).length;
  }

  getManageablePages(): AppAccessPage[] {
    return APP_ACCESS_PAGES.filter(
      p => p.enabled !== false && (!p.adminOnly || this.canManageAccessControl())
    );
  }

  getPagesByGroup(): { group: string; pages: AppAccessPage[] }[] {
    const manageableKeys = new Set(this.getManageablePages().map(p => p.key));
    return getAppAccessPagesByGroup()
      .map(g => ({
        group: g.group,
        pages: g.pages.filter(p => manageableKeys.has(p.key)),
      }))
      .filter(g => g.pages.length > 0);
  }

  parsePageKeysCsv(csv: any): string[] {
    if (!csv || typeof csv !== 'string') {
      return [];
    }
    if (this.isFullAccessCsv(csv)) {
      return [];
    }
    const valid = new Set(APP_ACCESS_PAGES.map(p => p.key));
    return csv
      .split(',')
      .map(s => s.trim())
      .filter(
        (s) =>
          s.length > 0 &&
          s !== AccessControlService.FULL_ACCESS_TOKEN &&
          valid.has(s)
      );
  }

  pageKeysToCsv(keys: string[]): string {
    const valid = new Set(APP_ACCESS_PAGES.map(p => p.key));
    const normalized = Array.from(
      new Set(keys.map(k => k.trim()).filter(k => valid.has(k)))
    );
    return normalized.join(',');
  }

  encodeAllowedPageRoutes(fullAccess: boolean, customKeys: string[]): string {
    if (fullAccess) {
      return AccessControlService.FULL_ACCESS_TOKEN;
    }
    let keys = [...customKeys];
    if (!keys.length) {
      keys = ['main-dashboard'];
    }
    if (!keys.includes('main-dashboard')) {
      keys = ['main-dashboard', ...keys];
    }
    return this.pageKeysToCsv(keys);
  }

  getManageableEndpoints(): AppAccessEndpoint[] {
    return [...APP_ACCESS_ENDPOINTS];
  }

  getEndpointsByGroup(): { group: string; endpoints: AppAccessEndpoint[] }[] {
    return getAppAccessEndpointsByGroup();
  }

  parseEndpointKeys(keys: any): string[] {
    if (!keys) {
      return [];
    }
    const valid = new Set(APP_ACCESS_ENDPOINTS.map(e => e.key));
    const list = Array.isArray(keys) ? keys : String(keys).split(',');
    return list.map((k: string) => k.trim()).filter((k: string) => k && valid.has(k));
  }

  endpointKeysToCsv(keys: string[]): string {
    const valid = new Set(APP_ACCESS_ENDPOINTS.map(e => e.key));
    return Array.from(new Set(keys.map(k => k.trim()).filter(k => valid.has(k)))).join(',');
  }

  private currentRole(): string {
    return (sessionStorage.getItem('userrole') || '').toString();
  }

  private ensureLoaded(): void {
    if (!this.loaded) {
      this.refreshFromSession();
    }
  }
}
