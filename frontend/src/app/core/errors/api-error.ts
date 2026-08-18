import { HttpErrorResponse } from '@angular/common/http';

/** The backend's failure envelope. Every non-2xx JSON response uses this shape. */
export interface ApiErrorBody {
    readonly success: false;
    readonly error: {
        readonly code: string;
        readonly message: string;
        readonly details?: Readonly<Record<string, unknown>>;
        readonly requestId: string;
    };
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as { error?: { message?: unknown; code?: unknown } };
    return typeof candidate.error?.message === 'string' && typeof candidate.error?.code === 'string';
}

/**
 * Turns any HTTP failure into something worth showing a user.
 *
 * Falls back through the envelope, then older `{ message }` responses (several
 * endpoints still use that shape), then network/status heuristics — so callers
 * never have to decide what to display.
 */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
    if (!(error instanceof HttpErrorResponse)) {
        return error instanceof Error ? error.message : fallback;
    }

    if (isApiErrorBody(error.error)) {
        return error.error.error.message;
    }

    const legacy = error.error as { message?: unknown } | null;
    if (typeof legacy?.message === 'string') {
        return legacy.message;
    }

    // status 0 means the request never reached the server.
    if (error.status === 0) return 'Cannot reach the server. Check your connection.';
    if (error.status === 429) return 'Too many requests. Please wait a moment and try again.';
    if (error.status >= 500) return 'The server had a problem. Please try again shortly.';

    return fallback;
}

/**
 * The backend stamps every response with a request id. Surfacing it lets a user
 * quote one line that pinpoints their exact request in the logs.
 */
export function apiErrorRequestId(error: unknown): string | undefined {
    if (!(error instanceof HttpErrorResponse)) return undefined;
    if (isApiErrorBody(error.error)) return error.error.error.requestId;
    return error.headers?.get('X-Request-Id') ?? undefined;
}
