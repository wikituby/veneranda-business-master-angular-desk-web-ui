import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AccessControlService } from '../services/access-control.service';
import { TOP_LEVEL_ACCESS_PAGE_KEYS } from '../config/app-access-pages';

function resolvePageKeyFromUrl(url: string): string | null {
  const overviewMatch = url.match(/\/overview\/([^/?#]+)/);
  if (overviewMatch?.[1]) {
    const segment = overviewMatch[1];
    if (segment === 'main-dashboard') {
      return null;
    }
    if (segment === 'shop-item-management') {
      return 'consumable-items';
    }
    if (segment === 'shop-item-receive') {
      return 'stock-receive';
    }
    return segment;
  }

  for (const key of TOP_LEVEL_ACCESS_PAGE_KEYS) {
    const pattern = new RegExp(`/${key}(?:/|[?#]|$)`);
    if (pattern.test(url)) {
      return key;
    }
  }

  return null;
}

function checkPageAccess(url: string): boolean | ReturnType<Router['createUrlTree']> {
  const router = inject(Router);
  const access = inject(AccessControlService);
  access.refreshFromSession();

  const segment = resolvePageKeyFromUrl(url);
  if (!segment) {
    return true;
  }

  if (access.canAccessPage(segment)) {
    return true;
  }

  return router.createUrlTree(['/overview/main-dashboard'], {
    queryParams: { accessDenied: segment },
  });
}

/** Blocks overview child routes the logged-in user is not allowed to open. */
export const pageAccessGuard: CanActivateChildFn = (_route, state) =>
  checkPageAccess(state.url);

/** Blocks top-level clinical routes (e.g. /client-visit) when access is restricted. */
export const topLevelPageAccessGuard: CanActivateFn = (_route, state) =>
  checkPageAccess(state.url);
