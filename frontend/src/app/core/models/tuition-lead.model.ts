import { TeachingMode, TutorSummary } from './user.model';

export type LeadStatus = 'OPEN' | 'CLOSED';

/** A tuition requirement posted by a parent. */
export interface TuitionLead {
    readonly _id: string;
    /** Stripped from every tutor-facing response so locked leads stay anonymous. */
    readonly parentId?: string;
    readonly title: string;
    readonly subjects: readonly string[];
    readonly classLevel: string;
    readonly mode: TeachingMode;
    readonly location?: string;
    readonly budgetRange?: string;
    readonly description?: string;
    readonly status: LeadStatus;
    readonly createdAt: string;
    readonly updatedAt: string;
}

/** Parent contact details, revealed only once a tutor has unlocked the lead. */
export interface ParentContact {
    readonly name: string;
    /** The API substitutes 'Not provided' when the parent has no phone on file. */
    readonly phone: string;
    readonly email: string;
}

/** `GET /leads/my` — the parent's own leads, with the unlock count attached. */
export interface ParentLead extends TuitionLead {
    readonly interestCount: number;
}

/**
 * `GET /leads` — open leads as a tutor sees them. `isUnlocked` and
 * `parentContact` are mutable: the list patches them in place after an unlock
 * rather than refetching.
 */
export interface TutorLead extends TuitionLead {
    isUnlocked: boolean;
    parentContact: ParentContact | null;
    /** Client-only flag set after a report is accepted, so the form can collapse. */
    reportSubmitted?: boolean;
}

/** `GET /leads/unlocked` — leads this tutor has already paid to see. */
export interface UnlockedLead extends TuitionLead {
    readonly unlockedAt: string;
    readonly unlockPrice: number;
    readonly isUnlocked: true;
    readonly parentContact: ParentContact | null;
}

/** `GET /public/leads` — the anonymous teaser projection, no contact details. */
export interface PublicLead {
    readonly _id: string;
    readonly title: string;
    readonly subjects: readonly string[];
    readonly classLevel: string;
    readonly mode: TeachingMode;
    readonly budgetRange?: string;
    readonly location?: string;
    readonly createdAt: string;
}

/** `GET /leads/:id/interested-tutors` */
export interface InterestedTutor {
    readonly unlockedAt: string;
    readonly tutor: TutorSummary;
}

export interface CreateLeadRequest {
    readonly title: string;
    readonly subjects: readonly string[];
    readonly classLevel: string;
    readonly mode: TeachingMode;
    readonly location?: string;
    readonly budgetRange?: string;
    readonly description?: string;
}

/** `PUT /leads/:id` — the API accepts any subset, plus a status change. */
export type UpdateLeadRequest = Partial<CreateLeadRequest> & {
    readonly status?: LeadStatus;
};

/** `PATCH /admin/leads/:id/close` */
export interface CloseLeadResponse {
    readonly message: string;
    readonly lead: TuitionLead;
}
