import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../api.config';

@Injectable({
    providedIn: 'root'
})
export class PaymentService {
    private apiUrl = `${API_CONFIG.baseUrl}/payments`;

    constructor(private http: HttpClient) { }

    getPlans(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/plans`);
    }

    getTransactions(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/transactions`);
    }

    validateCoupon(code: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/validate-coupon`, { code });
    }

    createOrder(planId: string, couponCode?: string): Observable<any> {
        return this.http.post(`${API_CONFIG.baseUrl}/create-order`, { planId, couponCode });
    }

    verifyPayment(paymentData: any): Observable<any> {
        return this.http.post(`${API_CONFIG.baseUrl}/verify-payment`, paymentData);
    }
}
