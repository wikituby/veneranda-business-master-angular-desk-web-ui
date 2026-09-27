/** Header department shortcuts that still exist in the business console. */
export interface HeaderDepartmentLink {
  pageKey: string;
  label: string;
  /** Absolute route, e.g. /overview/dashboard */
  path: string;
  icon: string;
}

export const HEADER_DEPARTMENT_LINKS: HeaderDepartmentLink[] = [
  {
    pageKey: 'dashboard',
    label: 'Financial Management',
    path: '/overview/dashboard',
    icon: 'bi-currency-dollar',
  },
];
