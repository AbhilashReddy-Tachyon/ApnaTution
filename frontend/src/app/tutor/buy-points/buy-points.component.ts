import { Component, OnInit, ChangeDetectorRef, isDevMode } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PaymentService } from '../../core/services/payment.service';
import { AuthService } from '../../core/services/auth.service';
import {
    CreateOrderResponse,
    MyTransaction,
    SubscriptionPlan,
    VerifyPaymentRequest
} from '../../core/models';

/** The slice of Razorpay Checkout this page uses; the script is loaded in index.html. */
interface RazorpayHandlerResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

interface RazorpayFailureResponse {
    error?: { description?: string };
}

interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    handler: (response: RazorpayHandlerResponse) => void;
    prefill: { name?: string; email?: string };
    theme: { color: string };
    modal: { ondismiss: () => void };
}

interface RazorpayCheckout {
    on(event: 'payment.failed', handler: (response: RazorpayFailureResponse) => void): void;
    open(): void;
}

declare var Razorpay: new (options: RazorpayOptions) => RazorpayCheckout;

@Component({
    selector: 'app-buy-points',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './buy-points.component.html',
    styleUrls: ['./buy-points.component.css']
})
export class BuyPointsComponent implements OnInit {
    plans: SubscriptionPlan[] = [];
    couponCode = '';
    discountMessage = '';
    paymentError = '';
    loadingPlanId: string | null = null;
    currentPoints = 0;
    transactions: MyTransaction[] = [];

    constructor(
        private paymentService: PaymentService,
        private authService: AuthService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.paymentService.getPlans().subscribe({
            next: (data) => { this.plans = data ?? []; this.cdr.detectChanges(); },
            error: () => {}
        });
        this.authService.refreshProfile().subscribe({
            next: (user) => { this.currentPoints = user.points || 0; this.cdr.detectChanges(); },
            error: () => {}
        });
        this.loadTransactions();
    }

    loadTransactions(): void {
        this.paymentService.getTransactions().subscribe({
            next: (data) => { this.transactions = data ?? []; this.cdr.detectChanges(); },
            error: () => {}
        });
    }

    validateCoupon(): void {
        if (!this.couponCode.trim()) return;
        this.paymentService.validateCoupon(this.couponCode).subscribe({
            next: (res) => {
                this.discountMessage = `Coupon applied! ${res.discountPercentage}% discount`;
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.discountMessage = err.error?.message || 'Invalid or expired coupon';
                this.couponCode = '';
                this.cdr.detectChanges();
            }
        });
    }

    buyPlan(plan: SubscriptionPlan): void {
        if (this.loadingPlanId) return;

        this.loadingPlanId = plan._id;
        this.paymentError = '';
        this.paymentService.createOrder(plan._id, this.couponCode || undefined).subscribe({
            next: (order) => this.initiateRazorpay(order),
            error: (err) => {
                this.paymentError = err.error?.message || 'Could not create payment order. Please try again.';
                this.loadingPlanId = null;
                this.cdr.detectChanges();
            }
        });
    }

    initiateRazorpay(order: CreateOrderResponse): void {
        const user = this.authService.getUserFromToken();

        if (typeof Razorpay === 'undefined') {
            if (isDevMode() && confirm(`[DEV] Simulate payment of Rs ${order.amount} for ${order.points} points?`)) {
                this.verifyPayment({ transactionId: order.transactionId });
            } else {
                this.paymentError = 'Payment checkout is not available. Please try again in a few minutes.';
                this.loadingPlanId = null;
                this.cdr.detectChanges();
            }
            return;
        }

        const options = {
            key: order.key || 'rzp_test_placeholder',
            amount: order.amount * 100,
            currency: order.currency || 'INR',
            name: 'ApnaTutors',
            description: `${order.planName} - ${order.points} Points`,
            order_id: order.order_id,
            handler: (response: RazorpayHandlerResponse) => {
                this.verifyPayment({
                    transactionId: order.transactionId,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature
                });
            },
            prefill: { name: user?.name, email: user?.email },
            theme: { color: '#2563eb' },
            modal: {
                ondismiss: () => {
                    this.paymentError = 'Payment was cancelled before completion.';
                    this.loadingPlanId = null;
                    this.cdr.detectChanges();
                }
            }
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', (response: RazorpayFailureResponse) => {
            this.paymentError = response?.error?.description || 'Payment failed. Please try another method.';
            this.loadingPlanId = null;
            this.cdr.detectChanges();
        });
        rzp.open();
    }

    verifyPayment(data: VerifyPaymentRequest): void {
        this.paymentService.verifyPayment(data).subscribe({
            next: (res) => {
                this.currentPoints = res.points;
                this.loadingPlanId = null;
                this.loadTransactions();
                this.authService.refreshProfile().subscribe({
                    next: () => {
                        this.cdr.detectChanges();
                        this.router.navigate(['/tutor/leads']);
                    },
                    error: () => {
                        this.cdr.detectChanges();
                        this.router.navigate(['/tutor/leads']);
                    }
                });
            },
            error: (err) => {
                this.paymentError = err.error?.message || 'Payment verification failed. No points were added.';
                this.loadingPlanId = null;
                this.cdr.detectChanges();
            }
        });
    }
}
