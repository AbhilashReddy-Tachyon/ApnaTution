/** `GET /dashboard/parent` */
export interface ParentDashboardStats {
    readonly totalLeads: number;
    readonly activeLeads: number;
    readonly totalInterest: number;
}

/** `GET /dashboard/tutor` */
export interface TutorDashboardStats {
    readonly unlockedCount: number;
    readonly availableLeads: number;
    readonly points: number;
}

/** Whichever set the signed-in role is served. */
export type DashboardStats = ParentDashboardStats | TutorDashboardStats;

/** `GET /admin/stats` */
export interface AdminStats {
    readonly totalLeads: number;
    readonly openLeads: number;
    readonly totalUnlocks: number;
    /** Points spent on unlocks, not rupees. */
    readonly revenue: number;
    readonly paymentRevenue: number;
    readonly pendingPayments: number;
    readonly unlockEvents: number;
}

/**
 * The shared dashboard renders one template for all three roles, so it holds
 * whichever variant it fetched under a single type where every counter is
 * optional.
 */
export type DashboardSummary = Partial<ParentDashboardStats & TutorDashboardStats & AdminStats>;
