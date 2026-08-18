import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../api.config';
import { ParentDashboardStats, TutorDashboardStats } from '../models';

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private apiUrl = `${API_CONFIG.baseUrl}/dashboard`;

    constructor(private http: HttpClient) { }

    getParentStats(): Observable<ParentDashboardStats> {
        return this.http.get<ParentDashboardStats>(`${this.apiUrl}/parent`);
    }

    getTutorStats(): Observable<TutorDashboardStats> {
        return this.http.get<TutorDashboardStats>(`${this.apiUrl}/tutor`);
    }
}
