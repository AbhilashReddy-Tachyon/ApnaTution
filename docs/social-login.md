# Google sign-in setup

Uses an "ID token" flow: the frontend gets a signed identity token straight
from Google's JS SDK, sends it to the backend, and the backend verifies the
signature and issues our own JWT exactly like `/auth/login` does. No OAuth
client secret or server-side redirect is involved.

The button is hidden automatically until `GOOGLE_CLIENT_ID` is configured —
an empty `SOCIAL_AUTH_CONFIG.googleClientId` means "not set up yet".

## How account matching works

`POST /auth/google` (see `findOrCreateGoogleUser` in
`backend/src/controllers/auth.controller.cjs`) does a three-step lookup:

1. A user already linked to this Google account → log them in.
2. No link, but an existing account with the same (verified) email → link
   Google to that account and log them in.
3. No match at all → this is a new signup, which requires a `role`
   (`PARENT`/`TUTOR`). The register page always has one selected via its role
   toggle. The login page doesn't send one, so a first-time Google login
   there returns `422 { code: "ROLE_REQUIRED" }` with a message pointing the
   user to the sign-up page.

## Setup

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs &
   Services → Credentials** → **Create Credentials → OAuth client ID** →
   type **Web application**.
2. Under **Authorized JavaScript origins**, add every origin the app is
   served from, e.g. `http://localhost:4200` and your production domain.
   No redirect URI is needed — the button flow doesn't redirect.
3. Copy the generated **Client ID** into:
   - `backend/.env` → `GOOGLE_CLIENT_ID`
   - `frontend/src/app/core/social-auth.config.ts` → `googleClientId`
4. Works on localhost immediately — no domain verification required.
