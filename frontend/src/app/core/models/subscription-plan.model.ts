/** A points bundle a tutor can buy. `GET /payments/plans` returns active plans only. */
export interface SubscriptionPlan {
    readonly _id: string;
    readonly name: string;
    /** Rupees, not paise — the gateway conversion happens server-side. */
    readonly price: number;
    readonly points: number;
    readonly discountDescription?: string;
    readonly isActive: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
}

/** The plan fields populated onto a transaction. */
export type PlanSummary = Pick<SubscriptionPlan, '_id' | 'name' | 'points'>;
