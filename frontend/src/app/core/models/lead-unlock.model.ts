import { ParentContact } from './tuition-lead.model';

/** A tutor's paid unlock of one lead. One point, one row. */
export interface LeadUnlock {
    readonly _id: string;
    readonly tutorId: string;
    readonly leadId: string;
    readonly price: number;
    readonly createdAt: string;
    readonly updatedAt: string;
}

/**
 * `POST /leads/:id/unlock`. Returned both for a fresh unlock and for a repeat
 * call on an already-unlocked lead, so the contact is always present.
 */
export interface UnlockLeadResponse {
    readonly message: string;
    readonly remainingPoints: number;
    readonly parentContact: ParentContact;
}
