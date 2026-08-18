export interface Coupon {
    readonly _id: string;
    readonly code: string;
    readonly discountPercentage: number;
    readonly expiryDate?: string;
    readonly isActive: boolean;
    readonly usageLimit: number;
    readonly usedCount: number;
    readonly createdAt: string;
    readonly updatedAt: string;
}

/** `POST /payments/validate-coupon` — only returned for a usable coupon. */
export interface CouponValidationResponse {
    readonly valid: true;
    readonly discountPercentage: number;
    readonly code: string;
}
