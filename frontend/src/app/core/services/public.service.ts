import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../api.config';
import { PublicLead, PublicStats, PublicTutor } from '../models';

/** The unauthenticated `/public` endpoints backing the landing and browse pages. */
@Injectable({
    providedIn: 'root'
})
export class PublicService {
    private apiUrl = `${API_CONFIG.baseUrl}/public`;

    constructor(private http: HttpClient) { }

    getTutors(): Observable<PublicTutor[]> {
        return this.http.get<PublicTutor[]>(`${this.apiUrl}/tutors`);
    }

    getLeads(): Observable<PublicLead[]> {
        return this.http.get<PublicLead[]>(`${this.apiUrl}/leads`);
    }

    getStats(): Observable<PublicStats> {
        return this.http.get<PublicStats>(`${this.apiUrl}/stats`);
    }
}
