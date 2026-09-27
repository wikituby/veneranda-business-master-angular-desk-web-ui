export interface AppAccessComponent {
  key: string;
  pageKey: string;
  label: string;
  description: string;
  hideAfterOrderAgeHours?: number;
}

export const APP_ACCESS_COMPONENTS: AppAccessComponent[] = [
  {
    key: 'sold-summary-footer',
    pageKey: 'otc-dispensary',
    label: 'Products sold summary totals bar',
    description: 'Lower footer with total sell and profit on the Products sold tab (total cost uses Cost columns restriction).',
  },
  {
    key: 'sold-table-cost-sell',
    pageKey: 'otc-dispensary',
    label: 'Products sold table total sell column',
    description: 'Total sell column in the sold orders table.',
  },
  {
    key: 'sold-order-modal-financials',
    pageKey: 'otc-dispensary',
    label: 'Sell details popup sell columns (orders 5+ hrs old)',
    description: 'When frozen, hides Sell, TT Sell, and order total sell in the details popup for orders made more than 5 hours ago.',
    hideAfterOrderAgeHours: 5,
  },
  {
    key: 'cost-columns',
    pageKey: 'otc-dispensary',
    label: 'Cost columns (unit, TT, totals)',
    description: 'Hides Cost, TT Cost, unit buy, and total cost fields across Counter Sale, Prescriptions, Products sold, and order detail popups.',
  },
  {
    key: 'cost-columns',
    pageKey: 'consultation-v2',
    label: 'Prescription and billing cost columns',
    description: 'Hides Cost, TT Cost, unit cost, unit buy, and total cost in the pharmacy tab, treatment-plan modal, sundries modal, and visit billing summary.',
  },
];

export function getAppAccessComponentsForPage(pageKey: string): AppAccessComponent[] {
  return APP_ACCESS_COMPONENTS.filter((c) => c.pageKey === pageKey);
}

export function findAppAccessComponent(pageKey: string, componentKey: string): AppAccessComponent | undefined {
  return APP_ACCESS_COMPONENTS.find((c) => c.pageKey === pageKey && c.key === componentKey);
}

export function componentFullKey(pageKey: string, componentKey: string): string {
  return `${pageKey}.${componentKey}`;
}

export function parseComponentFullKey(fullKey: string): { pageKey: string; componentKey: string } | null {
  const idx = fullKey.indexOf('.');
  if (idx <= 0) {
    return null;
  }
  return {
    pageKey: fullKey.slice(0, idx),
    componentKey: fullKey.slice(idx + 1),
  };
}
