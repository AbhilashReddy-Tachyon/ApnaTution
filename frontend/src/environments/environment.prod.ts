/**
 * Production environment. Replaces `environment.ts` in the production build.
 *
 * Change `apiBaseUrl` here (not in component code) when the backend deployment
 * moves — it is the single place the frontend learns where the API lives.
 */
export const environment = {
    production: true,
    apiBaseUrl: 'https://apna-tution-backend.vercel.app',
    razorpayKeyId: 'rzp_test_placeholder',
} as const;
