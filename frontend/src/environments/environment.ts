/**
 * Development environment. Swapped for `environment.prod.ts` at build time via
 * the `fileReplacements` entry in angular.json.
 */
export const environment = {
    production: false,
    /** Relative so requests go through proxy.conf.json and avoid CORS locally. */
    apiBaseUrl: '/api',
    /** Razorpay publishable key — safe to ship; the secret lives server-side. */
    razorpayKeyId: 'rzp_test_placeholder',
} as const;
