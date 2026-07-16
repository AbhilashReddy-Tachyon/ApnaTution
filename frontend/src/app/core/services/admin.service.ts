import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../api.config';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private apiUrl = `${API_CONFIG.baseUrl}/admin`;

    constructor(private http: HttpClient) { }

    getStats(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/stats`);
    }

    getTransactions(status = ''): Observable<any[]> {
        const query = status ? `?status=${encodeURIComponent(status)}` : '';
        return this.http.get<any[]>(`${this.apiUrl}/transactions${query}`);
    }

    retryPendingCredit(transactionId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/transactions/${transactionId}/retry-credit`, {});
    }

    resolveProcessing(transactionId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/transactions/${transactionId}/resolve-processing`, {});
    }

    getLeadReports(status = ''): Observable<any[]> {
        const query = status ? `?status=${encodeURIComponent(status)}` : '';
        return this.http.get<any[]>(`${this.apiUrl}/lead-reports${query}`);
    }

    resolveLeadReport(reportId: string, action: 'APPROVE_REFUND' | 'REJECT', adminNote = ''): Observable<any> {
        return this.http.post(`${this.apiUrl}/lead-reports/${reportId}/resolve`, { action, adminNote });
    }

    closeLead(leadId: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/leads/${leadId}/close`, {});
    }
}
