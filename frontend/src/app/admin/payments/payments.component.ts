import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';

@Component({
    selector: 'app-admin-payments',
    standalone: true,
    imports: [CommonModule, FormsModule, AdminNavComponent],
    templateUrl: './payments.component.html',
    styleUrl: './payments.component.css'
})
export class AdminPaymentsComponent implements OnInit {
    // Transactions
    transactions: any[] = [];
    txLoading = true;
    txError = '';
    txStatus = '';
    txType = '';
    txPage = 1;
    txPages = 1;
    txTotal = 0;

    // Coupons
    coupons: any[] = [];
    couponsLoading = true;
    couponsError = '';
    couponBusyId: string | null = null;

    newCoupon = { code: '', discountPercentage: 10, usageLimit: 1000, expiryDate: '' };
    creatingCoupon = false;
    createCouponError = '';

    constructor(private adminService: AdminService, private cdr: ChangeDetectorRef) { }

    ngOnInit() {
        this.loadTransactions();
        this.loadCoupons();
    }

    loadTransactions() {
        this.txLoading = true;
        this.txError = '';
        this.adminService.getTransactions({ status: this.txStatus, type: this.txType, page: this.txPage, limit: 20 }).subscribe({
            next: (data) => {
                this.transactions = data?.transactions ?? [];
                this.txTotal = data?.total ?? 0;
                this.txPages = data?.pages ?? 1;
                this.txLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.txError = 'Failed to load transactions';
                this.txLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    onTxFilterChange() {
        this.txPage = 1;
        this.loadTransactions();
    }

    goToTxPage(p: number) {
        if (p < 1 || p > this.txPages) return;
        this.txPage = p;
        this.loadTransactions();
    }

    loadCoupons() {
        this.couponsLoading = true;
        this.couponsError = '';
        this.adminService.getCoupons().subscribe({
            next: (data) => {
                this.coupons = data ?? [];
                this.couponsLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.couponsError = 'Failed to load coupons';
                this.couponsLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    createCoupon() {
        if (!this.newCoupon.code.trim()) {
            this.createCouponError = 'Coupon code is required';
            return;
        }
        this.creatingCoupon = true;
        this.createCouponError = '';

        const payload: any = {
            code: this.newCoupon.code.trim().toUpperCase(),
            discountPercentage: this.newCoupon.discountPercentage,
            usageLimit: this.newCoupon.usageLimit
        };
        if (this.newCoupon.expiryDate) payload.expiryDate = this.newCoupon.expiryDate;

        this.adminService.createCoupon(payload).subscribe({
            next: (coupon) => {
                this.coupons.unshift(coupon);
                this.newCoupon = { code: '', discountPercentage: 10, usageLimit: 1000, expiryDate: '' };
                this.creatingCoupon = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.createCouponError = err?.error?.message || 'Failed to create coupon';
                this.creatingCoupon = false;
                this.cdr.detectChanges();
            }
        });
    }

    toggleCoupon(coupon: any) {
        this.couponBusyId = coupon._id;
        this.adminService.updateCoupon(coupon._id, { isActive: !coupon.isActive }).subscribe({
            next: (updated) => {
                coupon.isActive = updated.isActive;
                this.couponBusyId = null;
                this.cdr.detectChanges();
            },
            error: (err) => {
                alert(err?.error?.message || 'Failed to update coupon');
                this.couponBusyId = null;
                this.cdr.detectChanges();
            }
        });
    }
}
