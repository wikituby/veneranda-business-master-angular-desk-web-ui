export interface AppAccessPage {
  key: string;
  label: string;
  group: string;
  /** Hidden from assignment until the screen is ready. */
  enabled?: boolean;
  /** Only administrators may open this screen. */
  adminOnly?: boolean;
}

/**
 * Pages an administrator can grant in Access Control.
 * Groups and labels follow the business sidebar.
 */
export const APP_ACCESS_PAGES: AppAccessPage[] = [
  { key: 'main-dashboard', label: 'Main Dashboard', group: 'Analytics & Reports' },
  { key: 'departmental-reports', label: 'Departmental Reports', group: 'Analytics & Reports' },
  { key: 'revenue-reports', label: 'Revenue Reports', group: 'Analytics & Reports' },

  { key: 'all-clients', label: 'Registry', group: 'Client Management' },
  { key: 'client-groups', label: 'Client Groups', group: 'Client Management' },
  { key: 'client-dashboard', label: 'Client Dashboard', group: 'Client Management' },
  { key: 'client-visit', label: 'Client Visit', group: 'Client Management' },
  { key: 'open-closed-visit', label: 'Open Closed Order', group: 'Client Management' },

  { key: 'consumable-items', label: 'Consumable Products', group: 'Inventory — Product Management' },
  { key: 'asset-management', label: 'Assets Management', group: 'Inventory — Product Management' },

  { key: 'reorder-levels', label: 'Reorder Levels', group: 'Inventory — Stock Management' },
  { key: 'stock-receive', label: 'Stock Receive', group: 'Inventory — Stock Management' },
  { key: 'stock-batch', label: 'Stock Batch', group: 'Inventory — Stock Management' },
  { key: 'stock-transfer', label: 'Stock Transfer', group: 'Inventory — Stock Management' },
  { key: 'stock-tracking', label: 'Stock Tracking', group: 'Inventory — Stock Management' },
  { key: 'stock-verification', label: 'Stock Verification', group: 'Inventory — Stock Management' },
  { key: 'stock-initializer', label: 'Stock Initializer', group: 'Inventory — Stock Management' },
  { key: 'stock-taking', label: 'Stock Taking', group: 'Inventory — Stock Management' },
  { key: 'expired-items', label: 'Expired Items', group: 'Inventory — Stock Management' },
  { key: 'suppliers', label: 'Stock Suppliers', group: 'Inventory — Stock Management' },
  { key: 'manufacturers', label: 'Stock Manufacturers', group: 'Inventory — Stock Management' },
  { key: 'adjustments', label: 'Adjustments', group: 'Inventory — Stock Management' },
  { key: 'hmis-tracer-mapping', label: 'HMIS Tracer Mapping', group: 'Inventory — Stock Management' },

  { key: 'store-management', label: 'Store Management', group: 'Inventory — Store Management' },
  { key: 'store-reports', label: 'Store Reports', group: 'Inventory — Store Management' },
  { key: 'store-analytics', label: 'Store Analytics', group: 'Inventory — Store Management' },
  { key: 'inventory-dashboard', label: 'Inventory Dashboard', group: 'Inventory — Store Management' },

  { key: 'consultation-v2', label: 'Client Transactions', group: 'Business Departments' },

  { key: 'dashboard', label: 'Balance Sheet', group: 'Financial Management' },
  { key: 'expenses', label: 'Expenses', group: 'Financial Management' },
  { key: 'expense-categories', label: 'Expense Categories', group: 'Financial Management' },
  { key: 'expense-accounts', label: 'Expense Accounts', group: 'Financial Management' },
  { key: 'expense-transactions', label: 'Expense Transactions', group: 'Financial Management' },
  { key: 'expense-analytics', label: 'Expense Analytics', group: 'Financial Management' },
  { key: 'loan-management', label: 'Loan Management', group: 'Financial Management' },
  { key: 'income-management', label: 'Income Management', group: 'Financial Management' },
  { key: 'income-transactions', label: 'Income Transactions', group: 'Financial Management' },
  { key: 'income-accounts', label: 'Income Accounts', group: 'Financial Management' },
  { key: 'income-categories', label: 'Income Categories', group: 'Financial Management' },
  { key: 'cashier', label: 'Cashier Desk / Receipts', group: 'Financial Management' },
  { key: 'finance-dashboard', label: 'Finance Dashboard', group: 'Financial Management' },
  { key: 'service-charges', label: 'Service Charges Setup', group: 'Financial Management' },
  { key: 'refunds', label: 'Refunds & Adjustments', group: 'Financial Management' },
  { key: 'finance-reports', label: 'Financial Reports', group: 'Financial Management' },

  { key: 'services-management', label: 'All Services', group: 'Services Management' },
  { key: 'service-categories', label: 'Service Categories', group: 'Services Management' },
  { key: 'service-types', label: 'Service Types', group: 'Services Management' },

  { key: 'user-management', label: 'User Management & Roles', group: 'Administration & Setup' },
  { key: 'access-control', label: 'Access Control Panel', group: 'Administration & Setup', adminOnly: true },
  { key: 'special-privileges', label: 'Special Privileges', group: 'Administration & Setup', adminOnly: true },
  { key: 'subscription', label: 'Subscription Status', group: 'Administration & Setup' },
  { key: 'mobile-money-settings', label: 'DGateway / Mobile Money', group: 'Administration & Setup' },
  { key: 'business-settings', label: 'Business Settings', group: 'Administration & Setup' },
  { key: 'website-contact-messages', label: 'Website Contact Messages', group: 'Administration & Setup' },
  { key: 'department-setup', label: 'Business Directory Setup', group: 'Administration & Setup' },
  { key: 'data-backup', label: 'Backups & Restoration', group: 'Administration & Setup' },
  { key: 'system-documentation', label: 'System Documentation', group: 'Administration & Setup' },
  { key: 'system-configuration', label: 'System Configuration', group: 'Administration & Setup' },
  { key: 'audit-logs', label: 'Audit Logs', group: 'Administration & Setup' },

  { key: 'employee-registration', label: 'Employee Registration', group: 'Human Resource' },
  { key: 'department-assignment', label: 'Department & Role Assignment', group: 'Human Resource' },
  { key: 'attendance', label: 'Attendance & Shift Management', group: 'Human Resource' },
  { key: 'leave-management', label: 'Leave Management', group: 'Human Resource' },
  { key: 'payroll', label: 'Payroll Generation', group: 'Human Resource' },
  { key: 'performance-tracking', label: 'Performance Tracking', group: 'Human Resource' },

  { key: 'otc-dispensary', label: 'Point of Sale', group: 'Sales & Orders' },
  { key: 'pharmacy-dispensing', label: 'Sales Dispensing', group: 'Sales & Orders' },
  { key: 'pharmacy-purchase-orders', label: 'Purchase Orders', group: 'Sales & Orders' },
  { key: 'pharmacy-pricing', label: 'Product Pricing', group: 'Sales & Orders' },
  { key: 'pharmacy-expiry-alerts', label: 'Expiry Alerts', group: 'Sales & Orders' },
  { key: 'pharmacy-suppliers', label: 'Product Suppliers', group: 'Sales & Orders' },

  { key: 'messages', label: 'Messages', group: 'User Account' },
  { key: 'help', label: 'Help', group: 'User Account' },
  { key: 'settings-privacy', label: 'Settings & Privacy', group: 'User Account' },
  { key: 'user-profile', label: 'User Profile', group: 'User Account' },
];

const PAGE_BY_KEY = new Map(APP_ACCESS_PAGES.map((p) => [p.key, p]));

export function findAppAccessPage(key: string | null | undefined): AppAccessPage | undefined {
  if (!key) {
    return undefined;
  }
  return PAGE_BY_KEY.get(key);
}

export function getAppAccessPagesByGroup(): { group: string; pages: AppAccessPage[] }[] {
  const order: string[] = [];
  const map = new Map<string, AppAccessPage[]>();
  for (const page of APP_ACCESS_PAGES) {
    if (!map.has(page.group)) {
      order.push(page.group);
      map.set(page.group, []);
    }
    map.get(page.group)!.push(page);
  }
  return order.map((group) => ({ group, pages: map.get(group)! }));
}

/** Standalone routes outside /overview (messages, profile, etc.). */
export const TOP_LEVEL_ACCESS_PAGE_KEYS = new Set([
  'client-visit',
  'messages',
  'help',
  'settings-privacy',
  'user-profile',
]);
