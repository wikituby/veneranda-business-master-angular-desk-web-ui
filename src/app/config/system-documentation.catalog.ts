export interface SystemDocumentationEntry {
  id: string;
  file: string;
  title: string;
  description: string;
  order: number;
}

/** Markdown files under src/assets/documentation */
export const SYSTEM_DOCUMENTATION_CATALOG: SystemDocumentationEntry[] = [
  {
    id: 'index',
    file: 'README.md',
    title: 'Documentation index',
    description: 'CRM and ERP topics for the business manager',
    order: 0,
  },
  {
    id: 'overview',
    file: '01-system-overview.md',
    title: 'Business manager overview',
    description: 'How CRM and ERP modules fit together',
    order: 1,
  },
  {
    id: 'getting-started',
    file: '02-getting-started.md',
    title: 'Getting started',
    description: 'Sign in, navigation, and a working day',
    order: 2,
  },
  {
    id: 'crm',
    file: '03-client-care-workflows.md',
    title: 'CRM — clients & relationships',
    description: 'Accounts, contacts, groups, and follow-up',
    order: 3,
  },
  {
    id: 'sales-inventory',
    file: '04-pharmacy-and-inventory.md',
    title: 'ERP — sales, stock & stores',
    description: 'Documents, POS, inventory, and purchasing',
    order: 4,
  },
  {
    id: 'finance',
    file: '07-expense-management.md',
    title: 'ERP — finance',
    description: 'Expenses, debt, loans, and money movement',
    order: 5,
  },
  {
    id: 'admin-security',
    file: '05-administration-and-security.md',
    title: 'Administration & security',
    description: 'Users, access, stores, and business settings',
    order: 6,
  },
  {
    id: 'technical',
    file: '06-technical-guide.md',
    title: 'Technical guide',
    description: 'Desktop, mobile, and the shared backend',
    order: 7,
  },
];
