import { PlanSummary } from './subscription-plan.model';
import { User } from './user.model';

/** CREDIT = points bought, DEBIT = points spent. */
export type TransactionType = 'CREDIT' | 'DEBIT';

export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface Transaction {
    readonly _id: string;
    readonly userId: string;
    /** Rupees. Zero for point-only movements such as a lead unlock. */
    readonly amount: number;
    readonly type: TransactionType;
    readonly points: number;
    readonly description?: string;
    readonly planId?: string;
    readonly couponCode?: string;
    readonly status: TransactionStatus;
    /** The gateway order id. */
    readonly paymentId?: string;
    readonly gatewayPaymentId?: string;
    readonly processedAt?: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}

/** `GET /payments/transactions` — the caller's own history, plan populated. */
export interface MyTransaction extends Omit<Transaction, 'planId'> {
    readonly planId?: PlanSummary | null;
}

export type TransactionUserSummary = Pick<
    User,
    '_id' | 'name' | 'email' | 'role' | 'phone' | 'points'
>;

/** `GET /admin/transactions` — every user's history, user and plan populated. */
export interface AdminTransaction extends Omit<Transaction, 'userId' | 'planId'> {
    readonly userId: TransactionUserSummary | null;
    readonly planId?: PlanSummary | null;
}

/** `POST /admin/transactions/:id/retry-credit` */
export interface RetryCreditResponse {
    readonly message: string;
    /** The user's balance after the credit; absent when nothing was credited. */
    readonly points?: number;
}

/** `POST /admin/transactions/:id/resolve-processing` */
export interface ResolveProcessingResponse {
    readonly message: string;
    readonly transaction: Transaction;
}
