import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';
import { apiErrorMessage } from '../../core/errors/api-error';
import {
    AdminLeadReport,
    AdminStats,
    AdminTransaction,
    LeadReportAction,
    LeadReportStatus,
} from '../../core/models';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, AdminNavComponent],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
    stats: AdminStats | null = null;
    transactions: AdminTransaction[] = [];
    reports: AdminLeadReport[] = [];
    transactionStatus = '';
    reportStatus: LeadReportStatus | '' = 'PENDING';
    loadingTransactions = false;
    loadingReports = false;
    actionId: string | null = null;
    notice = '';

    constructor(private adminService: AdminService, private cdr: ChangeDetectorRef) { }

    ngOnInit() {
        this.loadStats();
        this.loadTransactions();
        this.loadReports();
    }

    loadStats() {
        this.adminService.getStats().subscribe({
            next: (data) => { this.stats = data; this.cdr.detectChanges(); },
            error: (err) => console.error('Failed to load stats', err)
        });
    }

    loadTransactions() {
        this.loadingTransactions = true;
        this.adminService.getTransactions({ status: this.transactionStatus }).subscribe({
            next: (data) => {
                this.transactions = data.transactions ?? data;
                this.loadingTransactions = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loadingTransactions = false;
                this.notice = 'Could not load transactions.';
                this.cdr.detectChanges();
            }
        });
    }

    setStatus(event: Event) {
        this.transactionStatus = (event.target as HTMLSelectElement).value;
        this.loadTransactions();
    }

    retryCredit(transaction: AdminTransaction) {
        if (!confirm('Credit points for this pending transaction now? Confirm payment in Razorpay first.')) return;
        this.actionId = transaction._id;
        this.adminService.retryPendingCredit(transaction._id).subscribe({
            next: (res) => {
                this.notice = res.message || 'Transaction credited.';
                this.actionId = null;
                this.loadStats();
                this.loadTransactions();
            },
            error: (err) => {
                this.notice = apiErrorMessage(err, 'Action failed.');
                this.actionId = null;
                this.cdr.detectChanges();
            }
        });
    }

    resolveProcessing(transaction: AdminTransaction) {
        if (!confirm('Mark this processing payment as successful without adding more points? Use only after confirming the user already received points.')) return;
        this.actionId = transaction._id;
        this.adminService.resolveProcessing(transaction._id).subscribe({
            next: (res) => {
                this.notice = res.message || 'Transaction resolved.';
                this.actionId = null;
                this.loadTransactions();
            },
            error: (err) => {
                this.notice = apiErrorMessage(err, 'Action failed.');
                this.actionId = null;
                this.cdr.detectChanges();
            }
        });
    }

    loadReports() {
        this.loadingReports = true;
        this.adminService.getLeadReports(this.reportStatus).subscribe({
            next: (data) => {
                this.reports = data;
                this.loadingReports = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loadingReports = false;
                this.notice = 'Could not load lead reports.';
                this.cdr.detectChanges();
            }
        });
    }

    setReportStatus(event: Event) {
        this.reportStatus = (event.target as HTMLSelectElement).value as LeadReportStatus | '';
        this.loadReports();
    }

    resolveReport(report: AdminLeadReport, action: LeadReportAction) {
        const note = prompt(action === 'APPROVE_REFUND' ? 'Admin note for refund approval' : 'Reason for rejection') || '';
        if (action === 'APPROVE_REFUND' && !confirm('Refund 1 point to this tutor?')) return;

        this.actionId = report._id;
        this.adminService.resolveLeadReport(report._id, action, note).subscribe({
            next: (res) => {
                this.notice = res.message || 'Report updated.';
                this.actionId = null;
                this.loadStats();
                this.loadReports();
                this.loadTransactions();
            },
            error: (err) => {
                this.notice = apiErrorMessage(err, 'Report action failed.');
                this.actionId = null;
                this.cdr.detectChanges();
            }
        });
    }
}
