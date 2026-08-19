export type UserRole = 'PARENT' | 'TUTOR' | 'ADMIN';

/** Teaching/tuition mode — shared by user profiles and tuition leads. */
export type TeachingMode = 'ONLINE' | 'HOME' | 'BOTH';

/**
 * A full user document as returned by `GET /auth/profile`, `PUT /auth/profile`
 * and `GET /public/tutors`. Secrets (password, OTP hashes, reset tokens) are
 * stripped server-side and are deliberately absent here.
 */
export interface User {
    readonly _id: string;
    readonly role: UserRole;
    readonly name: string;
    readonly email: string;
    readonly phone?: string;
    /** Tutors only; schema default is an empty array, so always present. */
    readonly subjects: readonly string[];
    readonly tagline?: string;
    readonly location?: string;
    readonly pincode?: string;
    readonly rating: number;
    readonly reviewsCount: number;
    readonly experience?: string;
    readonly mode: TeachingMode;
    readonly hourlyRate?: string;
    readonly isVerified: boolean;
    readonly emailVerified: boolean;
    readonly phoneVerified: boolean;
    readonly points: number;
    readonly createdAt: string;
    readonly updatedAt: string;
}

/** A tutor as listed publicly — same document, minus nothing the UI reads. */
export type PublicTutor = User;

/** The tutor fields populated onto a lead unlock (`GET /leads/:id/interested-tutors`). */
export type TutorSummary = Pick<
    User,
    | '_id'
    | 'name'
    | 'email'
    | 'phone'
    | 'subjects'
    | 'location'
    | 'experience'
    | 'mode'
    | 'hourlyRate'
    | 'tagline'
    | 'rating'
    | 'reviewsCount'
    | 'isVerified'
    | 'emailVerified'
    | 'phoneVerified'
>;

/** The trimmed user object returned alongside the token on login. */
export interface AuthUser {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly role: UserRole;
    readonly points: number;
    readonly emailVerified: boolean;
    readonly phoneVerified: boolean;
    readonly isVerified: boolean;
}

/** Claims signed into the JWT by the backend, plus the standard registered ones. */
export interface JwtPayload {
    readonly id: string;
    readonly role: UserRole;
    readonly name: string;
    readonly iat?: number;
    readonly exp?: number;
}

/**
 * What the app holds for the signed-in user: the JWT claims, widened with
 * profile fields once `/auth/profile` has been fetched.
 */
export type SessionUser = JwtPayload & Partial<User>;
