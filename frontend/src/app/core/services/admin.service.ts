import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

    closeLead(leadId: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/leads/${leadId}/close`, {});
    }

    deleteLead(leadId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/leads/${leadId}`);
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
