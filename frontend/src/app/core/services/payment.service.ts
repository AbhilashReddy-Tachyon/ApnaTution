import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../api.config';
import {
    CouponValidationResponse,
    CreateOrderResponse,
    MyTransaction,
    SubscriptionPlan,
    VerifyPaymentRequest,
    VerifyPaymentResponse
} from '../models';

@Injectable({
    providedIn: 'root'
})
export class PaymentService {
    private apiUrl = `${API_CONFIG.baseUrl}/payments`;

    constructor(private http: HttpClient) { }

    getPlans(): Observable<SubscriptionPlan[]> {
        return this.http.get<SubscriptionPlan[]>(`${this.apiUrl}/plans`);
    }

    getTransactions(): Observable<MyTransaction[]> {
        return this.http.get<MyTransaction[]>(`${this.apiUrl}/transactions`);
    }

    validateCoupon(code: string): Observable<CouponValidationResponse> {
        return this.http.post<CouponValidationResponse>(`${this.apiUrl}/validate-coupon`, { code });
    }

    createOrder(planId: string, couponCode?: string): Observable<CreateOrderResponse> {
        return this.http.post<CreateOrderResponse>(`${API_CONFIG.baseUrl}/create-order`, { planId, couponCode });
    }

    verifyPayment(paymentData: VerifyPaymentRequest): Observable<VerifyPaymentResponse> {
        return this.http.post<VerifyPaymentResponse>(`${API_CONFIG.baseUrl}/verify-payment`, paymentData);
    }
}
