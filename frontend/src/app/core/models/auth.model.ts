import { AuthUser, TeachingMode, User, UserRole } from './user.model';

export interface LoginRequest {
    readonly email: string;
    readonly password: string;
}

/** `POST /auth/login` */
export interface LoginResponse {
    readonly token: string;
    readonly user: AuthUser;
}

/** The login payload is the only response that establishes a session. */
export type AuthResponse = LoginResponse;

/** `POST /auth/register` — only PARENT and TUTOR may self-register. */
export interface RegisterRequest {
    readonly role: Extract<UserRole, 'PARENT' | 'TUTOR'>;
    readonly name: string;
    readonly email: string;
    readonly password: string;
    readonly phone?: string;
    /** Tutors only; the form sends a comma-separated string, the API accepts both. */
    readonly subjects?: readonly string[] | string;
    readonly location?: string;
}

/** `PUT /auth/profile` — role, email, password and points are rejected server-side. */
export interface UpdateProfileRequest {
    readonly name?: string;
    readonly phone?: string;
    readonly tagline?: string;
    readonly subjects?: readonly string[] | string;
    readonly location?: string;
    readonly pincode?: string;
    readonly experience?: string;
    readonly hourlyRate?: string;
    readonly mode?: TeachingMode;
}

export type OtpChannel = 'email' | 'phone';

/** `POST /auth/verification/request` — `devOtp` is only sent outside production. */
export interface VerificationRequestResponse {
    readonly message: string;
    readonly devOtp?: string;
}

/** `POST /auth/verification/verify` */
export interface VerifyOtpResponse {
    readonly message: string;
    readonly user: User;
}
