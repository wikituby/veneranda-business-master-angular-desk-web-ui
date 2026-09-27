/** Protectable API endpoints (must match backend EndpointAccessCatalog). */
export interface AppAccessEndpoint {
  key: string;
  label: string;
  group: string;
  httpMethod: string;
  pathContains: string;
  /** Overview page key that also grants this endpoint for users with custom page access. */
  pageKey?: string;
}

export const APP_ACCESS_ENDPOINTS: AppAccessEndpoint[] = [
  {
    key: 'stock.transfer.create',
    label: 'Transfer stock (POST)',
    group: 'Inventory — Stock Management',
    httpMethod: 'POST',
    pathContains: '/Business-item/transfer-stock',
    pageKey: 'stock-transfer',
  },
  {
    key: 'stock.transfer.list',
    label: 'List stock transfers (GET)',
    group: 'Inventory — Stock Management',
    httpMethod: 'GET',
    pathContains: '/Business-item/stock-transfers',
    pageKey: 'stock-transfer',
  },
];

export function getAppAccessEndpointsByGroup(): { group: string; endpoints: AppAccessEndpoint[] }[] {
  const map = new Map<string, AppAccessEndpoint[]>();
  for (const ep of APP_ACCESS_ENDPOINTS) {
    if (!map.has(ep.group)) {
      map.set(ep.group, []);
    }
    map.get(ep.group)!.push(ep);
  }
  return Array.from(map.entries()).map(([group, endpoints]) => ({ group, endpoints }));
}

export function endpointKeysForPage(pageKey: string): string[] {
  return APP_ACCESS_ENDPOINTS.filter(e => e.pageKey === pageKey).map(e => e.key);
}
