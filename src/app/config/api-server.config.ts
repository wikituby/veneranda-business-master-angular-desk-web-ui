export const API_CONTEXT_PATH = '/health_care';
export const API_DEFAULT_PORT = 8080;
export const API_DEV_SERVER_PORTS = [4800, 4900] as const;
export const API_DEV_SERVER_PORT = API_DEV_SERVER_PORTS[0];

/** Dev-server proxy base for the current browser port (4800 / 4900). */
export function getDevProxyBase(): string {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    const port = Number(window.location.port);
    if (API_DEV_SERVER_PORTS.includes(port as (typeof API_DEV_SERVER_PORTS)[number])) {
      return `http://localhost:${port}${API_CONTEXT_PATH}`;
    }
  }
  return `http://localhost:${API_DEV_SERVER_PORT}${API_CONTEXT_PATH}`;
}

/**
 * When `ng serve` runs with proxy.conf.json, API calls via the dev server avoid CORS
 * and always reach the backend on localhost:8080.
 */
export const API_DEV_PROXY_BASE = getDevProxyBase();

/** This PC's LAN IP when sharing Quarkus with phones on the same Wi‑Fi. */
export const API_DEFAULT_LAN_HOST = '192.168.1.114';
export const API_HEALTH_PATH = '/health';

/** Direct call to API on this machine (Quarkus / local mother emulator). */
export const API_LOCALHOST_BASE = `http://localhost:${API_DEFAULT_PORT}${API_CONTEXT_PATH}`;

/** Hosted Quarkus API on Render (public cloud). */
export const API_CLOUD_BASE = `https://backend-mc2d.onrender.com${API_CONTEXT_PATH}`;

/** Canonical public API host for the marketing website (contact form, etc.). */
export const API_VENERANDA_PUBLIC_BASE = `https://api.venerandahospital.org${API_CONTEXT_PATH}`;

/** Mother app / PC Quarkus on LAN. */
export const API_DEFAULT_LAN_BASE = `http://${API_DEFAULT_LAN_HOST}:${API_DEFAULT_PORT}${API_CONTEXT_PATH}`;

export const STORAGE_KEY_ACTIVE_BASE = 'apiActiveBaseUrl';
export const STORAGE_KEY_SAVED_BASES = 'apiSavedServers';
export const STORAGE_KEY_PRE_LOGIN_SERVER_CONFIRMED = 'apiPreLoginServerConfirmed';

export const HEALTH_CHECK_TIMEOUT_MS = 5000;
/** Render free tier may need time to wake from sleep. */
export const CLOUD_HEALTH_CHECK_TIMEOUT_MS = 90000;

export function isAngularDevServer(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname, port } = window.location;
  return (
    hostname === 'localhost' &&
    API_DEV_SERVER_PORTS.includes(Number(port) as (typeof API_DEV_SERVER_PORTS)[number])
  );
}

/** Map ng serve proxy base (e.g. :4800) back to the real Quarkus backend for display. */
export function toDisplayBaseUrl(baseUrl: string): string {
  const value = (baseUrl || '').trim();
  if (!value || !isAngularDevServer()) {
    return value;
  }
  try {
    const parsed = new URL(value.replace(/\/+$/, ''));
    const host = (parsed.hostname || '').toLowerCase();
    const port = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80));
    if (
      (host === 'localhost' || host === '127.0.0.1') &&
      API_DEV_SERVER_PORTS.includes(port as (typeof API_DEV_SERVER_PORTS)[number])
    ) {
      return API_LOCALHOST_BASE;
    }
  } catch {
    /* keep value */
  }
  return value;
}

