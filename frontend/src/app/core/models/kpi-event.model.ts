/**
 * An analytics event written by the backend (LEAD_VIEW, LEAD_UNLOCK, …).
 * `eventType` is an open string on the server, so it is not narrowed here.
 */
export interface KpiEvent {
    readonly _id: string;
    readonly userId?: string;
    readonly eventType: string;
    readonly metadata?: Record<string, unknown>;
    readonly createdAt: string;
    readonly updatedAt: string;
}
