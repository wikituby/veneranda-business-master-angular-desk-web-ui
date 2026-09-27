import { Router } from '@angular/router';
import { ActiveRoomService } from '../services/active-room.service';
import { SubscriptionService } from '../services/subscription.service';

const CLINICAL_REGISTRY_ROLES = new Set(['nurse', 'doctor', 'clinician']);

function isClinicalRegistryRole(role: string): boolean {
  return CLINICAL_REGISTRY_ROLES.has(role);
}

function navigateByRole(
  router: Router,
  rawRole: string | null | undefined,
  _isSmallScreen?: () => boolean
): void {
  const role = (rawRole ?? '').toString().toLowerCase().trim();

  if (isClinicalRegistryRole(role)) {
    router.navigate(['/overview/all-clients']);
    return;
  }
  router.navigate(['/overview/main-dashboard']);
}

/**
 * After login: load subscription status first. Without active subscription → subscription page.
 * With active subscription → role-based landing route.
 */
export function navigateAfterLogin(
  router: Router,
  subscription: SubscriptionService,
  rawRole: string | null | undefined,
  isSmallScreen?: () => boolean,
  activeRoom?: ActiveRoomService
): void {
  subscription.loadStatus().subscribe({
    next: () => {
      // On-prem localhost/LAN clinics skip the cloud subscription gate.
      if (!subscription.isActive() && !subscription.isOnPremClinicApi()) {
        activeRoom?.clearActiveRoom();
        router.navigate(['/overview/subscription']);
        return;
      }
      activeRoom?.initializeFromSession().subscribe();
      navigateByRole(router, rawRole, isSmallScreen);
    },
    error: () => {
      activeRoom?.clearActiveRoom();
      // Login already succeeded — enter the app even if subscription status cannot be loaded.
      navigateByRole(router, rawRole, isSmallScreen);
    },
  });
}
