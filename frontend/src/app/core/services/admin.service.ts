import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../api.config';
import {
    AdminLeadReport,
    AdminStats,
    AdminTransaction,
    CloseLeadResponse,
    LeadReportAction,
    LeadReportStatus,
    ResolveLeadReportResponse,
    ResolveProcessingResponse,
    RetryCreditResponse,
    TransactionStatus
} from '../models';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private apiUrl = `${API_CONFIG.baseUrl}/admin`;

    constructor(private http: HttpClient) { }

    getStats(): Observable<AdminStats> {
        return this.http.get<AdminStats>(`${this.apiUrl}/stats`);
    }

    getTransactions(status: TransactionStatus | '' = ''): Observable<AdminTransaction[]> {
        return this.http.get<AdminTransaction[]>(`${this.apiUrl}/transactions`, {
            params: status ? new HttpParams().set('status', status) : new HttpParams()
        });
    }

    retryPendingCredit(transactionId: string): Observable<RetryCreditResponse> {
        return this.http.post<RetryCreditResponse>(`${this.apiUrl}/transactions/${transactionId}/retry-credit`, {});
    }

    resolveProcessing(transactionId: string): Observable<ResolveProcessingResponse> {
        return this.http.post<ResolveProcessingResponse>(`${this.apiUrl}/transactions/${transactionId}/resolve-processing`, {});
    }

    getLeadReports(status: LeadReportStatus | '' = ''): Observable<AdminLeadReport[]> {
        return this.http.get<AdminLeadReport[]>(`${this.apiUrl}/lead-reports`, {
            params: status ? new HttpParams().set('status', status) : new HttpParams()
        });
    }

    resolveLeadReport(
        reportId: string,
        action: LeadReportAction,
        adminNote = ''
    ): Observable<ResolveLeadReportResponse> {
        return this.http.post<ResolveLeadReportResponse>(
            `${this.apiUrl}/lead-reports/${reportId}/resolve`,
            { action, adminNote }
        );
    }

    closeLead(leadId: string): Observable<CloseLeadResponse> {
        return this.http.patch<CloseLeadResponse>(`${this.apiUrl}/leads/${leadId}/close`, {});
    }
}
