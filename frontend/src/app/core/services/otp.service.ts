import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../api.config';

@Injectable({
    providedIn: 'root'
})
export class OtpService {
    private apiUrl = `${API_CONFIG.baseUrl}/otp`;

    constructor(private http: HttpClient) { }

    sendOtp(phone: string): Observable<{ message: string; devMode?: boolean }> {
        return this.http.post<{ message: string; devMode?: boolean }>(`${this.apiUrl}/send`, { phone });
    }

    verifyOtp(phone: string, otp: string): Observable<{ verified: boolean; phoneToken: string }> {
        return this.http.post<{ verified: boolean; phoneToken: string }>(`${this.apiUrl}/verify`, { phone, otp });
    }
}
