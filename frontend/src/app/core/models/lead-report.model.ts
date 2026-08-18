import { TuitionLead } from './tuition-lead.model';
import { User } from './user.model';

export type LeadReportReason =
    | 'NO_RESPONSE'
    | 'WRONG_CONTACT'
    | 'DUPLICATE'
    | 'ALREADY_FILLED'
    | 'OTHER';

export type LeadReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** What an admin can do with a pending report. */
export type LeadReportAction = 'APPROVE_REFUND' | 'REJECT';

/** A tutor's complaint about a lead they paid to unlock. */
export interface LeadReport {
    readonly _id: string;
    readonly leadId: string;
    readonly tutorId: string;
    readonly reason: LeadReportReason;
    readonly details?: string;
    readonly status: LeadReportStatus;
    readonly adminNote?: string;
    readonly refundedPoints: number;
    readonly resolvedAt?: string;
    readonly resolvedBy?: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export type ReportedLeadSummary = Pick<
    TuitionLead,
    '_id' | 'title' | 'classLevel' | 'subjects' | 'location' | 'status'
>;

export type ReportingTutorSummary = Pick<User, '_id' | 'name' | 'email' | 'phone' | 'points'>;

/**
 * `GET /admin/lead-reports` — the same document with its references populated.
 * A reference is null when the lead or tutor has since been deleted.
 */
export interface AdminLeadReport extends Omit<LeadReport, 'leadId' | 'tutorId' | 'resolvedBy'> {
    readonly leadId: ReportedLeadSummary | null;
    readonly tutorId: ReportingTutorSummary | null;
    readonly resolvedBy?: Pick<User, '_id' | 'name' | 'email'> | null;
}

/** `POST /leads/:id/report` */
export interface ReportLeadResponse {
    readonly message: string;
    readonly report: LeadReport;
}

/** `POST /admin/lead-reports/:id/resolve` */
export interface ResolveLeadReportResponse {
    readonly message: string;
    readonly report: LeadReport;
}
