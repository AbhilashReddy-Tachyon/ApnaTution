import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../api.config';
import {
    CreateLeadRequest,
    InterestedTutor,
    LeadReportReason,
    ParentLead,
    ReportLeadResponse,
    ResolvedArea,
    TuitionLead,
    TutorLead,
    UnlockedLead,
    UnlockLeadResponse,
    UpdateLeadRequest
} from '../models';

@Injectable({
    providedIn: 'root'
})
export class LeadService {
    private apiUrl = `${API_CONFIG.baseUrl}/leads`;

    constructor(private http: HttpClient) { }

    createLead(lead: CreateLeadRequest): Observable<TuitionLead> {
        return this.http.post<TuitionLead>(this.apiUrl, lead);
    }

    getLead(id: string): Observable<TuitionLead> {
        return this.http.get<TuitionLead>(`${this.apiUrl}/${id}`);
    }

    updateLead(id: string, lead: UpdateLeadRequest): Observable<TuitionLead> {
        return this.http.put<TuitionLead>(`${this.apiUrl}/${id}`, lead);
    }

    getMyLeads(): Observable<ParentLead[]> {
        return this.http.get<ParentLead[]>(`${this.apiUrl}/my`);
    }

    getInterestedTutors(leadId: string): Observable<InterestedTutor[]> {
        return this.http.get<InterestedTutor[]>(`${this.apiUrl}/${leadId}/interested-tutors`);
    }

    getLeadsForTutor(pincode?: string): Observable<{ leads: TutorLead[]; area: ResolvedArea | null }> {
        const url = pincode ? `${this.apiUrl}?pincode=${pincode}` : this.apiUrl;
        return this.http.get<{ leads: TutorLead[]; area: ResolvedArea | null }>(url);
    }

    getUnlockedLeads(): Observable<UnlockedLead[]> {
        return this.http.get<UnlockedLead[]>(`${this.apiUrl}/unlocked`);
    }

    unlockLead(leadId: string): Observable<UnlockLeadResponse> {
        return this.http.post<UnlockLeadResponse>(`${this.apiUrl}/${leadId}/unlock`, {});
    }

    reportLead(leadId: string, reason: LeadReportReason, details?: string): Observable<ReportLeadResponse> {
        return this.http.post<ReportLeadResponse>(`${this.apiUrl}/${leadId}/report`, { reason, details });
    }
}
