import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

/**
 * Attaches the bearer token and turns an expired session into a real logout.
 *
 * Functional rather than DI-class based: the old `HTTP_INTERCEPTORS` form
 * constructed AuthService (which injects HttpClient) while HttpClient was still
 * being constructed — a latent cycle. `inject()` here resolves lazily, per
 * request, so the cycle cannot form.
 */
export const tokenInterceptor: HttpInterceptorFn = (request, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const token = authService.getToken();
    const authorized = token
        ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : request;

    return next(authorized).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                authService.clearSession();

                // Previously the session was cleared but the user was left
                // sitting on a now-forbidden page with no explanation. Send them
                // to login, remembering where they were so they land back there.
                const returnUrl = router.url;
                const alreadyOnLogin = router.url.startsWith('/login');

                if (!alreadyOnLogin) {
                    void router.navigate(['/login'], {
                        queryParams: returnUrl === '/' ? {} : { returnUrl },
                    });
                }
            }

            return throwError(() => error);
        })
    );
};
