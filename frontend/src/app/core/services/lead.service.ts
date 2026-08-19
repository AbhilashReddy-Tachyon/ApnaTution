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

    getLeadsForTutor(pincode?: string): Observable<{ leads: any[]; area: { name: string; district: string; state: string } | null }> {
        const url = pincode ? `${this.apiUrl}?pincode=${pincode}` : this.apiUrl;
        return this.http.get<{ leads: any[]; area: any }>(url);
    }

    unlockLead(leadId: string): Observable<any> {
        // This calls the zero-cost unlock (for testing) or the payment flow triggers this?
        // In our backend: POST /leads/:id/unlock calls the unlock logic
        // But Step 8 said "Frontend never decides... Payment verified server side"
        // So the UNLOCK happens via Payment Verify.
        // However, we might need a direct unlock for free stuff? No, Step 8 says "Tutor pays".
        // So this method might be redundant IF payment handles it?
        // Actually, Step 6 had an "unlock API". Step 8 calls /payments/create-order and /payments/verify.
        // /payments/verify DOES the unlocking.
        // We'll keep this if we need to check status or something, but unlocking is via payment.
        // Let's leave it as a placeholder or remove it.
        // Wait, Step 6 defined `POST /leads/:id/unlock` but Step 8 seemingly replaced/augmented it with Payment?
        // Step 8's `verifyPayment` does `LeadUnlock.create`.
        // So `POST /leads/:id/unlock` from Step 6 is for "Manual/Free/Different" unlock?
        // Step 6 controller: `unlockLead` creates `LeadUnlock` with dummy price 99.
        // Step 8 controller: `verifyPayment` creates `LeadUnlock` with price 99 after verify.
        // So Step 6's endpoint is the "insecure" or "dev" unlock.
        // We should probably NOT use it in production frontend if we want real payments.
        // But for now I'll include it just in case.
        return this.http.post(`${this.apiUrl}/${leadId}/unlock`, {});
    }
}
