import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Roles a route accepts, read from `data: { roles: [...] }`. */
function allowedRoles(route: ActivatedRouteSnapshot): string[] {
    const configured = route.data['roles'] ?? route.data['role'];
    if (!configured) return [];
    return Array.isArray(configured) ? configured : [configured];
}

/**
 * Authorises by role. Accepts a list rather than a single value so a route can
 * serve more than one role without duplicating its definition.
 *
 * A signed-in user with the wrong role is sent to an explicit 403 page — the
 * previous silent bounce to `/` left them with no idea why they were moved.
 */
export const roleGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const roles = allowedRoles(route);
    const userRole = authService.getRole();

    if (!userRole) {
        return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    if (roles.length === 0 || roles.includes(userRole)) {
        return true;
    }

    return router.createUrlTree(['/forbidden']);
};
