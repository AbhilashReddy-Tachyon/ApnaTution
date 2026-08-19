import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, inject } from '@angular/core';

import { NotificationService } from '../notifications/notification.service';
import { apiErrorMessage, apiErrorRequestId } from './api-error';

/**
 * Last line of defence for errors nothing else caught.
 *
 * Without this, an unhandled failure went to the console and the user saw an
 * interface that had simply stopped responding, with no indication why.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    private readonly notifications = inject(NotificationService);

    handleError(error: unknown): void {
        // Always keep the console record — it is what a developer reads.
        console.error(error);

        // 401 is already handled by the token interceptor (clear session +
        // redirect); a second toast would just be noise on top of a redirect.
        if (error instanceof HttpErrorResponse && error.status === 401) {
            return;
        }

        const requestId = apiErrorRequestId(error);
        this.notifications.error(
            apiErrorMessage(error, 'Something went wrong. Please try again.'),
            requestId ? `Reference: ${requestId}` : undefined
        );
    }
}
