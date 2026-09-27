import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, timeout, catchError, of } from 'rxjs';
import {
  API_CLOUD_BASE,
  API_CONTEXT_PATH,
  API_DEFAULT_LAN_BASE,
  API_DEFAULT_PORT,
  API_DEV_PROXY_BASE,
  API_HEALTH_PATH,
  API_LOCALHOST_BASE,
  CLOUD_HEALTH_CHECK_TIMEOUT_MS,
  getDevProxyBase,
  HEALTH_CHECK_TIMEOUT_MS,
  STORAGE_KEY_ACTIVE_BASE,
  STORAGE_KEY_SAVED_BASES,
  STORAGE_KEY_PRE_LOGIN_SERVER_CONFIRMED,
  isAngularDevServer,
  toDisplayBaseUrl,
} from '../config/api-server.config';
import { FacilityBrandingService } from './facility-branding.service';

export type ApiConnectionState = 'resolving' | 'ready' | 'needs_input';

const RECOVERY_POLL_MS = 4000;
export const SKIP_CONNECTION_HEADER = 'X-Skip-Connection-Modal';

@Injectable({
  providedIn: 'root',
})
export class ApiConfigService {
  private activeBaseUrl = API_DEFAULT_LAN_BASE;
  private connectionState: ApiConnectionState = 'resolving';

  private readonly stateSubject = new BehaviorSubject<ApiConnectionState>('resolving');
  readonly state$ = this.stateSubject.asObservable();

  private readonly recoveryCheckingSubject = new BehaviorSubject<boolean>(false);
  readonly recoveryChecking$ = this.recoveryCheckingSubject.asObservable();

  private recoveryPollId?: ReturnType<typeof setInterval>;
  private recoveryInFlight = false;

  constructor(
    private http: HttpClient,
    private injector: Injector
  ) {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.connectionState === 'needs_input') {
          void this.tryRecoverConnection();
        }
      });
    }
  }

  static isNetworkError(error: HttpErrorResponse | null | undefined): boolean {
    return ApiConfigService.isServerUnreachableError(error);
  }

  /** True when the failure indicates the clinic API host cannot be reached. */
  static isServerUnreachableError(error: HttpErrorResponse | null | undefined): boolean {
    if (!error) {
      return false;
    }
    if (error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504) {
      return true;
    }
    if (error.error instanceof ProgressEvent) {
      return true;
    }
    const bodyText =
      typeof error.error === 'string'
        ? error.error
        : typeof error.error?.message === 'string'
          ? error.error.message
          : '';
    const message = `${error.message || ''} ${error.statusText || ''} ${bodyText}`.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('unknown error') ||
      message.includes('err_connection') ||
      message.includes('err_network') ||
      message.includes('err_internet_disconnected') ||
      message.includes('connection refused') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('enotfound') ||
      message.includes('enetunreach') ||
      message.includes('socket hang up') ||
      message.includes('gateway') ||
      message.includes('service unavailable') ||
      message.includes('proxy error') ||
      message.includes('cannot connect') ||
      message.includes('not reachable') ||
      message.includes('server unreachable') ||
      message.includes('timeout')
    );
  }

  /** True for generic failures (e.g. RxJS timeout) that are not HttpErrorResponse. */
  static isGenericUnreachableError(error: unknown): boolean {
    if (error instanceof HttpErrorResponse) {
      return ApiConfigService.isServerUnreachableError(error);
    }
    const message = `${error ?? ''}`.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('fetch')
    );
  }

  isClinicApiRequest(url: string): boolean {
    const normalized = (url || '').trim().toLowerCase();
    if (!normalized) {
      return false;
    }

    // Ignore third-party hosts (Firebase, Dropbox, etc.).
    if (/^https?:\/\//.test(normalized)) {
      const host = normalized.replace(/^https?:\/\//, '').split('/')[0];
      if (
        host.includes('googleapis') ||
        host.includes('firebase') ||
        host.includes('dropbox') ||
        host.includes('groq.com') ||
        host.includes('openrouter.ai')
      ) {
        return false;
      }
    }

    if (normalized.includes(API_CONTEXT_PATH.toLowerCase())) {
      return true;
    }
    if (normalized.includes(`:${API_DEFAULT_PORT}`)) {
      return true;
    }

    try {
      const active = this.getBaseUrl().replace(/\/+$/, '').toLowerCase();
      if (active && normalized.startsWith(active)) {
        return true;
      }
    } catch {
      /* ignore */
    }

    if (isAngularDevServer()) {
      const path = normalized.replace(/^https?:\/\/[^/]+/, '');
      if (path.startsWith('/health_care') || path.startsWith('health_care')) {
        return true;
      }
    }

    return false;
  }

  shouldReportUnreachableFailure(url: string, error: unknown): boolean {
    if (!this.isClinicApiRequest(url)) {
      return false;
    }
    return ApiConfigService.isGenericUnreachableError(error);
  }

  shouldSkipConnectionHandling(req: { url: string; headers: { has: (name: string) => boolean } }): boolean {
    if (req.headers.has(SKIP_CONNECTION_HEADER)) {
      return true;
    }
    return this.isHealthCheckRequest(req.url);
  }

  isHealthCheckRequest(url: string): boolean {
    const normalized = (url || '').toLowerCase();
    return normalized.includes(API_HEALTH_PATH.toLowerCase()) || normalized.endsWith('/health');
  }

  reportNetworkFailure(): void {
    // Pre-login users already picked a server — don't bounce them back to the picker.
    if (!this.isUserLoggedIn() && this.hasPreLoginServerConfirmed()) {
      return;
    }
    this.enterNeedsInputState();
  }

  getBaseUrl(): string {
    return this.activeBaseUrl;
  }

  /** Human-readable API host (shows :8080 during ng serve, not the dev-proxy port). */
  getDisplayBaseUrl(): string {
    return toDisplayBaseUrl(this.activeBaseUrl);
  }

  toDisplayBaseUrl(baseUrl: string): string {
    return toDisplayBaseUrl(baseUrl);
  }

  getConnectionState(): ApiConnectionState {
    return this.connectionState;
  }

  isReady(): boolean {
    return this.connectionState === 'ready';
  }

  needsUserInput(): boolean {
    return this.connectionState === 'needs_input';
  }

  /** True when the user must pick a server before signing in. */
  requiresPreLoginServerSelection(): boolean {
    if (this.isUserLoggedIn() || this.hasPreLoginServerConfirmed()) {
      return false;
    }
    // If we have a previously saved active base URL, skip the server picker
    if (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY_ACTIVE_BASE)) {
      return false;
    }
    return true;
  }

  /** Whether the global server connection overlay should be visible. */
  shouldShowServerConnection(): boolean {
    if (this.hasPreLoginServerConfirmed() && this.getSavedActiveBase()) {
      return false;
    }
    return this.connectionState === 'needs_input' || this.requiresPreLoginServerSelection();
  }

  /** Clear pre-login server choice (e.g. on logout) and prompt again. */
  resetPreLoginServerSelection(): void {
    sessionStorage.removeItem(STORAGE_KEY_PRE_LOGIN_SERVER_CONFIRMED);
    localStorage.removeItem(STORAGE_KEY_PRE_LOGIN_SERVER_CONFIRMED);
    this.stopRecoveryPolling();
    try {
      this.injector.get(FacilityBrandingService).hydrateFromLocalAssets();
    } catch {
      /* ignore */
    }
    this.setState('needs_input');
  }

  /** Open the global server connection overlay so the user can pick another API host. */
  openServerConnectionDialog(): void {
    this.stopRecoveryPolling();
    this.setState('needs_input');
  }

  getSavedServers(): string[] {
    return this.readSavedList();
  }

  /** Called once at app startup (APP_INITIALIZER). */
  async initializeOnStartup(): Promise<void> {
    // ng serve: never keep a stale LAN/phone URL — use the local proxy → Quarkus on this PC.
    if (isAngularDevServer()) {
      const saved = this.getSavedActiveBase();
      if (saved) {
        try {
          const host = new URL(this.normalizeBaseUrl(saved)).hostname.toLowerCase();
          if (host !== 'localhost' && host !== '127.0.0.1') {
            localStorage.removeItem(STORAGE_KEY_ACTIVE_BASE);
          }
        } catch {
          localStorage.removeItem(STORAGE_KEY_ACTIVE_BASE);
        }
      }
    }

    if (this.requiresPreLoginServerSelection()) {
      this.setState('needs_input');
      return;
    }

    const savedActive = this.getSavedActiveBase();
    if (savedActive && this.hasPreLoginServerConfirmed()) {
      this.restoreSavedConnection(savedActive);
      void this.verifySavedConnectionInBackground(savedActive);
      return;
    }

    this.setState('resolving');
    // Do not block first paint — landing/login pages should render immediately.
    void this.resolveConnectionInBackground();
  }

  private restoreSavedConnection(baseUrl: string): void {
    const normalized = this.normalizeBaseUrl(baseUrl);
    this.activeBaseUrl = normalized;
    this.connectionState = 'ready';
    this.stateSubject.next('ready');
  }

  private async verifySavedConnectionInBackground(baseUrl: string): Promise<void> {
    const normalized = this.normalizeBaseUrl(baseUrl);
    const ok = await this.checkHealth(normalized, this.healthTimeoutFor(normalized));
    if (ok) {
      await this.applyWorkingBase(normalized);
      return;
    }
    if (this.isUserLoggedIn()) {
      this.enterNeedsInputState();
    }
  }

  private async resolveConnectionInBackground(): Promise<void> {
    const savedActive = this.getSavedActiveBase();
    if (savedActive) {
      const normalized = this.normalizeBaseUrl(savedActive);
      if (await this.checkHealth(normalized, this.healthTimeoutFor(normalized))) {
        await this.applyWorkingBase(normalized);
        return;
      }
    }

    const candidates = this.buildCandidateList();
    const working = await this.findFirstHealthy(candidates);
    if (working) {
      await this.applyWorkingBase(working);
      return;
    }

    if (savedActive && this.hasPreLoginServerConfirmed()) {
      this.restoreSavedConnection(savedActive);
      return;
    }

    this.enterNeedsInputState();
  }

  /** Probe a custom or saved URL from the connection dialog. */
  async connectTo(baseUrl: string, options?: { timeoutMs?: number }): Promise<boolean> {
    const normalized = this.normalizeBaseUrl(baseUrl);
    const timeoutMs =
      options?.timeoutMs ??
      (normalized === API_CLOUD_BASE ? CLOUD_HEALTH_CHECK_TIMEOUT_MS : HEALTH_CHECK_TIMEOUT_MS);
    const ok = await this.checkHealth(normalized, timeoutMs);
    if (ok) {
      await this.applyWorkingBase(normalized);
      return true;
    }
    return false;
  }

  /**
   * Connect using localhost (dev proxy when on ng serve, else direct :8080).
   * Only succeeds when /health returns OK — never skips the health check.
   */
  async connectToLocalhost(): Promise<boolean> {
    const target = isAngularDevServer() ? getDevProxyBase() : API_LOCALHOST_BASE;
    return this.connectTo(target);
  }

  normalizeBaseUrl(input: string): string {
    let value = (input || '').trim();
    if (!value) {
      return API_LOCALHOST_BASE;
    }
    if (!/^https?:\/\//i.test(value)) {
      // Bare IPs / localhost → http (LAN). Hostnames (api.example.com) → https.
      const hostToken = value.split('/')[0].split(':')[0].toLowerCase();
      const useHttp =
        hostToken === 'localhost' ||
        hostToken === '127.0.0.1' ||
        /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostToken);
      value = `${useHttp ? 'http' : 'https'}://${value}`;
    }
    value = value.replace(/\/+$/, '');
    const isHttps = /^https:\/\//i.test(value);
    const hostPart = value.replace(/^https?:\/\//i, '').split('/')[0];
    // Only force local API port for plain HTTP hosts (LAN / localhost). HTTPS uses 443.
    if (!isHttps && !hostPart.includes(':')) {
      const slashIdx = value.indexOf('/', value.indexOf('//') + 2);
      value =
        slashIdx === -1
          ? `${value}:${API_DEFAULT_PORT}`
          : `${value.slice(0, slashIdx)}:${API_DEFAULT_PORT}${value.slice(slashIdx)}`;
    }
    if (!value.endsWith(API_CONTEXT_PATH)) {
      value = `${value}${API_CONTEXT_PATH}`;
    }

    // During ng serve, rewrite localhost/127.0.0.1 API URLs through the same-origin
    // proxy so /health avoids cross-origin CORS failures to :8080.
    if (isAngularDevServer()) {
      try {
        const parsed = new URL(value);
        const host = (parsed.hostname || '').toLowerCase();
        if (host === 'localhost' || host === '127.0.0.1') {
          return getDevProxyBase();
        }
      } catch {
        /* keep normalized value */
      }
    }
    return value;
  }

  private buildCandidateList(): string[] {
    const seen = new Set<string>();
    const list: string[] = [];
    const add = (url: string | null | undefined) => {
      if (!url) return;
      const n = this.normalizeBaseUrl(url);
      if (!seen.has(n)) {
        seen.add(n);
        list.push(n);
      }
    };

    // During ng serve, prefer same-origin proxy → local Quarkus (schema we just migrated).
    if (isAngularDevServer()) {
      add(getDevProxyBase());
      add(API_LOCALHOST_BASE);
    }

    const active = localStorage.getItem(STORAGE_KEY_ACTIVE_BASE);
    add(active);
    for (const s of this.readSavedList()) {
      add(s);
    }

    // LAN PC / mother phone when not on the Angular dev server.
    add(API_DEFAULT_LAN_BASE);
    if (!isAngularDevServer()) {
      add(API_LOCALHOST_BASE);
    }
    add(API_CLOUD_BASE);
    return list;
  }

  private readSavedList(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SAVED_BASES);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === 'string').map((x) => this.normalizeBaseUrl(x))
        : [];
    } catch {
      return [];
    }
  }

  private writeSavedList(urls: string[]): void {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const u of urls) {
      const n = this.normalizeBaseUrl(u);
      if (!seen.has(n)) {
        seen.add(n);
        unique.push(n);
      }
    }
    localStorage.setItem(STORAGE_KEY_SAVED_BASES, JSON.stringify(unique.slice(0, 20)));
  }

  private async findFirstHealthy(candidates: string[]): Promise<string | null> {
    const checks = await Promise.all(
      candidates.map(async (base) =>
        (await this.checkHealth(base, this.healthTimeoutFor(base))) ? base : null
      )
    );
    return checks.find((base) => base != null) ?? null;
  }

  private healthTimeoutFor(baseUrl: string): number {
    return this.normalizeBaseUrl(baseUrl) === API_CLOUD_BASE
      ? CLOUD_HEALTH_CHECK_TIMEOUT_MS
      : HEALTH_CHECK_TIMEOUT_MS;
  }

  private getSavedActiveBase(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_BASE);
    return raw && raw.trim() ? raw : null;
  }

  private async checkHealth(baseUrl: string, timeoutMs = HEALTH_CHECK_TIMEOUT_MS): Promise<boolean> {
    const url = `${this.normalizeBaseUrl(baseUrl)}${API_HEALTH_PATH}`;
    try {
      const response = await firstValueFrom(
        this.http
          .get(url, {
            responseType: 'text',
            observe: 'response',
            headers: new HttpHeaders({ [SKIP_CONNECTION_HEADER]: '1' }),
          })
          .pipe(timeout(timeoutMs), catchError(() => of(null)))
      );
      if (!response || response.status < 200 || response.status >= 300) {
        return false;
      }
      const body = response.body != null ? String(response.body).trim().toUpperCase() : '';
      // Quarkus returns "OK". Allow empty body on 200 in case a proxy strips it.
      return body === '' || body === 'OK' || body.includes('OK');
    } catch {
      return false;
    }
  }

  private startRecoveryPolling(): void {
    if (this.recoveryPollId != null) {
      return;
    }
    void this.tryRecoverConnection();
    this.recoveryPollId = setInterval(() => void this.tryRecoverConnection(), RECOVERY_POLL_MS);
  }

  private stopRecoveryPolling(): void {
    if (this.recoveryPollId != null) {
      clearInterval(this.recoveryPollId);
      this.recoveryPollId = undefined;
    }
    this.recoveryCheckingSubject.next(false);
    this.recoveryInFlight = false;
  }

  private async tryRecoverConnection(): Promise<void> {
    if (this.connectionState !== 'needs_input' || this.recoveryInFlight) {
      return;
    }
    this.recoveryInFlight = true;
    this.recoveryCheckingSubject.next(true);
    try {
      const candidates = this.buildCandidateList();
      const working = await this.findFirstHealthy(candidates);
      if (working) {
        await this.applyWorkingBase(working);
      }
    } finally {
      this.recoveryInFlight = false;
      if (this.connectionState === 'needs_input') {
        this.recoveryCheckingSubject.next(false);
      }
    }
  }

  /**
   * Apply a working base URL only after it passed the health check (or was
   * already verified by the caller via {@link connectTo} / startup probe).
   * Mark ready immediately so login is not blocked by branding / CORS quirks.
   */
  private async applyWorkingBase(baseUrl: string): Promise<void> {
    const normalized = this.normalizeBaseUrl(baseUrl);
    this.activeBaseUrl = normalized;
    localStorage.setItem(STORAGE_KEY_ACTIVE_BASE, normalized);
    const saved = [normalized, ...this.readSavedList().filter((s) => s !== normalized)];
    this.writeSavedList(saved);
    this.markPreLoginServerConfirmed();
    this.stopRecoveryPolling();

    // Unblock login as soon as /health is OK. Branding is best-effort after that.
    this.connectionState = 'ready';
    this.stateSubject.next('ready');

    try {
      const branding = this.injector.get(FacilityBrandingService);
      void branding.loadPublicFromConnectedServer();
    } catch {
      /* Login will use defaults / local cache */
    }
  }

  private enterNeedsInputState(): void {
    if (!this.isUserLoggedIn() && this.hasPreLoginServerConfirmed() && this.getSavedActiveBase()) {
      return;
    }
    if (this.connectionState === 'needs_input') {
      if (this.shouldAutoRecover()) {
        this.startRecoveryPolling();
      }
      this.stateSubject.next('needs_input');
      return;
    }
    this.setState('needs_input');
    if (this.shouldAutoRecover()) {
      this.startRecoveryPolling();
    }
  }

  private shouldAutoRecover(): boolean {
    return this.isUserLoggedIn();
  }

  private isUserLoggedIn(): boolean {
    if (typeof sessionStorage === 'undefined') {
      return false;
    }
    const jwt = sessionStorage.getItem('jwt');
    return !!jwt && jwt.trim().length > 0;
  }

  private hasPreLoginServerConfirmed(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    // Check localStorage (persists across reloads) and sessionStorage (legacy)
    return (
      localStorage.getItem(STORAGE_KEY_PRE_LOGIN_SERVER_CONFIRMED) === '1' ||
      sessionStorage.getItem(STORAGE_KEY_PRE_LOGIN_SERVER_CONFIRMED) === '1'
    );
  }

  private markPreLoginServerConfirmed(): void {
    localStorage.setItem(STORAGE_KEY_PRE_LOGIN_SERVER_CONFIRMED, '1');
    sessionStorage.setItem(STORAGE_KEY_PRE_LOGIN_SERVER_CONFIRMED, '1');
  }

  private setState(state: ApiConnectionState): void {
    this.connectionState = state;
    this.stateSubject.next(state);
  }
}
