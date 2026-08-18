/** `POST /payments/create-order` — everything Razorpay Checkout needs, plus our ids. */
export interface CreateOrderResponse {
    readonly transactionId: string;
    /** Rupees. */
    readonly amount: number;
    readonly amount_paise: number;
    readonly points: number;
    readonly planName: string;
    readonly paymentId: string;
    readonly order_id: string;
    readonly currency: string;
    /** Null when the gateway is unconfigured (development only). */
    readonly key: string | null;
}

/**
 * `POST /payments/verify`. The razorpay_* fields are omitted in the development
 * flow where no gateway is configured.
 */
export interface VerifyPaymentRequest {
    readonly transactionId: string;
    readonly razorpay_payment_id?: string;
    readonly razorpay_order_id?: string;
    readonly razorpay_signature?: string;
}

export interface VerifyPaymentResponse {
    readonly message: string;
    /** The user's points balance after the credit was applied. */
    readonly points: number;
}
