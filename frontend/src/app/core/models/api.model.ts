/**
 * Shapes shared by every endpoint.
 *
 * Dates arrive as ISO strings — Mongo's `Date` is serialised by `res.json()`,
 * so nothing on the client is ever a real `Date` unless it constructs one.
 */

/** The body of the backend's failure envelope (see backend errorHandler.cjs). */
export interface ApiErrorBody {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
    readonly requestId: string;
}

/** Every non-2xx response from the API carries this shape. */
export interface ApiErrorResponse {
    readonly success: false;
    readonly error: ApiErrorBody;
}

/** Endpoints whose only payload is a human-readable confirmation. */
export interface MessageResponse {
    readonly message: string;
}
