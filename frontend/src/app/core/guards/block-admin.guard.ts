import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Admins are confined to the admin console — any non-admin route bounces them
// straight back to /admin instead of letting them browse the marketplace UI.
export const blockAdminGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.getRole() === 'ADMIN') {
        return router.createUrlTree(['/admin']);
    }
    return true;
};
