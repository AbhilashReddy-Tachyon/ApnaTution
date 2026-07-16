import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../api.config';

@Injectable({
    providedIn: 'root'
})
export class LeadService {
    private apiUrl = `${API_CONFIG.baseUrl}/leads`;

    constructor(private http: HttpClient) { }

    createLead(lead: any): Observable<any> {
        return this.http.post(this.apiUrl, lead);
    }

    getLead(id: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/${id}`);
    }

    updateLead(id: string, lead: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}`, lead);
    }

    getMyLeads(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/my`);
    }

    getInterestedTutors(leadId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/${leadId}/interested-tutors`);
    }

    getLeadsForTutor(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl);
    }

    getUnlockedLeads(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/unlocked`);
    }

    unlockLead(leadId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/${leadId}/unlock`, {});
    }

    reportLead(leadId: string, reason: string, details?: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/${leadId}/report`, { reason, details });
    }
}
