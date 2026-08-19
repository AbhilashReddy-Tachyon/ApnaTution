import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

import { API_CONFIG } from '../api.config';
import {
    JwtPayload,
    LoginRequest,
    LoginResponse,
    MessageResponse,
    OtpChannel,
    RegisterRequest,
    SessionUser,
    UpdateProfileRequest,
    User,
    UserRole,
    VerificationRequestResponse,
    VerifyOtpResponse
} from '../models';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = `${API_CONFIG.baseUrl}/auth`;
    private tokenKey = 'apna_tution_token';

    private userSubject = new BehaviorSubject<SessionUser | null>(this.getUserFromToken());
    public user$ = this.userSubject.asObservable();

    constructor(private http: HttpClient, private router: Router) { }

    register(user: RegisterRequest): Observable<MessageResponse> {
        return this.http.post<MessageResponse>(`${this.apiUrl}/register`, user);
    }

    login(credentials: LoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
            tap(response => {
                this.storeToken(response.token);
            })
        );
    }

    loginWithGoogle(idToken: string, role?: string | null): Observable<any> {
        return this.http.post<{ token: string }>(`${this.apiUrl}/google`, { idToken, role }).pipe(
            tap(response => {
                this.storeToken(response.token);
            })
        );
    }

    logout() {
        localStorage.removeItem(this.tokenKey);
        this.userSubject.next(null);
        this.router.navigate(['/']);
    }

    clearSession() {
        localStorage.removeItem(this.tokenKey);
        this.userSubject.next(null);
    }

    getToken(): string | null {
        return localStorage.getItem(this.tokenKey);
    }

    private storeToken(token: string) {
        localStorage.setItem(this.tokenKey, token);
        this.userSubject.next(this.getUserFromToken());
    }

    getUserFromToken(): SessionUser | null {
        const token = this.getToken();
        if (!token) return null;
        try {
            const decoded = jwtDecode<JwtPayload>(token);
            if (decoded?.exp && decoded.exp * 1000 <= Date.now()) {
                this.clearSession();
                return null;
            }
            return decoded;
        } catch (e) {
            this.clearSession();
            return null;
        }
    }

    getRole(): UserRole | null {
        const user = this.userSubject.value;
        return user ? user.role : null;
    }

    isAuthenticated(): boolean {
        return !!this.getUserFromToken();
    }

    getProfile(): Observable<User> {
        return this.http.get<User>(`${this.apiUrl}/profile`);
    }

    refreshProfile(): Observable<User> {
        return this.getProfile().pipe(
            tap(profile => {
                const currentUser = this.userSubject.value;
                if (!currentUser) return;
                this.userSubject.next({ ...currentUser, ...profile });
            })
        );
    }

    updateProfile(userData: UpdateProfileRequest): Observable<User> {
        return this.http.put<User>(`${this.apiUrl}/profile`, userData);
    }

    requestVerification(channel: OtpChannel): Observable<VerificationRequestResponse> {
        return this.http.post<VerificationRequestResponse>(`${this.apiUrl}/verification/request`, { channel });
    }

    verifyOtp(channel: OtpChannel, otp: string): Observable<VerifyOtpResponse> {
        return this.http.post<VerifyOtpResponse>(`${this.apiUrl}/verification/verify`, { channel, otp }).pipe(
            tap(response => {
                if (response.user) {
                    const currentUser = this.userSubject.value;
                    if (!currentUser) return;
                    this.userSubject.next({ ...currentUser, ...response.user });
                }
            })
        );
    }

    forgotPassword(email: string): Observable<MessageResponse> {
        return this.http.post<MessageResponse>(`${this.apiUrl}/forgot-password`, { email });
    }

    resetPassword(token: string, password: string): Observable<MessageResponse> {
        return this.http.put<MessageResponse>(`${this.apiUrl}/reset-password/${token}`, { password });
    }
}
