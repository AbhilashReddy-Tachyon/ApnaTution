/** `GET /public/stats` — the counters shown on the landing page. */
export interface PublicStats {
    readonly tutors: number;
    readonly students: number;
    readonly activeLeads: number;
}
