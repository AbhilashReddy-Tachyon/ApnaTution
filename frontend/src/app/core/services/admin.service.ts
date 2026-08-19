import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../api.config';
import {
    AdminLeadReport,
    AdminStats,
    CloseLeadResponse,
    LeadReportAction,
    LeadReportStatus,
    ResolveLeadReportResponse,
    ResolveProcessingResponse,
    RetryCreditResponse
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

    // Users
    getUsers(params: { role?: string; search?: string; isActive?: string; page?: number; limit?: number } = {}): Observable<any> {
        let httpParams = new HttpParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                httpParams = httpParams.set(key, String(value));
            }
        });
        return this.http.get<any>(`${this.apiUrl}/users`, { params: httpParams });
    }

    setUserStatus(userId: string, isActive: boolean): Observable<any> {
        return this.http.patch(`${this.apiUrl}/users/${userId}/status`, { isActive });
    }

    // Leads
    getLeads(params: { status?: string; search?: string; page?: number; limit?: number } = {}): Observable<any> {
        let httpParams = new HttpParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                httpParams = httpParams.set(key, String(value));
            }
        });
        return this.http.get<any>(`${this.apiUrl}/leads`, { params: httpParams });
    }

    closeLead(leadId: string): Observable<CloseLeadResponse> {
        return this.http.patch<CloseLeadResponse>(`${this.apiUrl}/leads/${leadId}/close`, {});
    }

    deleteLead(leadId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/leads/${leadId}`);
    }

    setLeadVerification(leadId: string, status: 'PENDING' | 'VERIFIED' | 'NOT_VERIFIED', note: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/leads/${leadId}/verification`, { status, note });
    }

    // Lead reports (tutor-submitted reports of bad/spam leads)
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

    // Transactions
    getTransactions(params: { status?: string; type?: string; search?: string; page?: number; limit?: number } = {}): Observable<any> {
        let httpParams = new HttpParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                httpParams = httpParams.set(key, String(value));
            }
        });
        return this.http.get<any>(`${this.apiUrl}/transactions`, { params: httpParams });
    }

    retryPendingCredit(transactionId: string): Observable<RetryCreditResponse> {
        return this.http.post<RetryCreditResponse>(`${this.apiUrl}/transactions/${transactionId}/retry-credit`, {});
    }

    resolveProcessing(transactionId: string): Observable<ResolveProcessingResponse> {
        return this.http.post<ResolveProcessingResponse>(`${this.apiUrl}/transactions/${transactionId}/resolve-processing`, {});
    }

    // Coupons
    getCoupons(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/coupons`);
    }

    createCoupon(coupon: { code: string; discountPercentage: number; expiryDate?: string; usageLimit?: number }): Observable<any> {
        return this.http.post(`${this.apiUrl}/coupons`, coupon);
    }

    updateCoupon(couponId: string, updates: Partial<{ discountPercentage: number; expiryDate: string; isActive: boolean; usageLimit: number }>): Observable<any> {
        return this.http.patch(`${this.apiUrl}/coupons/${couponId}`, updates);
    }
}
