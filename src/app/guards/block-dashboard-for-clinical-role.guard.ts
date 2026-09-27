import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/** Blocks `/dashboard` (DashboardComponent) for clinician / doctor; they may use all other routes. */
export const blockDashboardForClinicalRoleGuard: CanActivateFn = () => {
  const router = inject(Router);
  const r = (sessionStorage.getItem('userrole') || '').toString().toLowerCase().trim();
  if (r === 'clinician' || r === 'doctor') {
    router.navigate(['/overview/otc-dispensary']);
    return false;
  }
  return true;
};
