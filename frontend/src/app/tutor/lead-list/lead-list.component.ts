import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LeadService } from '../../core/services/lead.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { apiErrorMessage } from '../../core/errors/api-error';
import { LeadReportReason, ResolvedArea, TutorLead } from '../../core/models';

const PINCODE_RE = /^\d{6}$/;

@Component({
    selector: 'app-lead-list',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './lead-list.component.html',
    styleUrl: './lead-list.component.css'
})
export class LeadListComponent implements OnInit {
    allLeads: TutorLead[] = [];
    filteredLeads: TutorLead[] = [];
    filters = { location: '', pincode: '', course: '', subject: '', mode: '' };
    loadingLeads = false;
    unlockingId: string | null = null;
    reportingId: string | null = null;
    reportReason: Record<string, LeadReportReason> = {};
    reportDetails: Record<string, string> = {};

    // Set once a valid pincode resolves to an area — while active, allLeads
    // itself is scoped to that area/pincode instead of every open lead.
    resolvedArea: ResolvedArea | null = null;
    nearbyError = '';

    constructor(
        private leadService: LeadService,
        private authService: AuthService,
        private notifications: NotificationService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.loadLeads();
    }

    loadLeads(pincode?: string) {
        this.loadingLeads = true;
        this.leadService.getLeadsForTutor(pincode).subscribe({
            next: (res) => {
                this.allLeads = res.leads || [];
                this.resolvedArea = res.area || null;
                this.filteredLeads = [...this.allLeads];
                this.applyFilters();
                this.loadingLeads = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loadingLeads = false;
                this.notifications.error('Failed to load leads. Please refresh.');
                this.cdr.detectChanges();
            }
        });
    }

    onFilterChange(field: string, event: Event) {
        const value = (event.target as HTMLInputElement | HTMLSelectElement).value;

        if (field === 'pincode') {
            const pincode = value.trim();
            this.filters.pincode = pincode;
            this.nearbyError = '';
            if (PINCODE_RE.test(pincode)) {
                this.loadLeads(pincode);
            } else {
                this.resolvedArea = null;
                this.loadLeads();
            }
            return;
        }

        this.filters[field as keyof typeof this.filters] = value.toLowerCase();
        this.applyFilters();
    }

    applyFilters() {
        this.filteredLeads = this.allLeads.filter(lead => {
            const locMatch = !this.filters.location ||
                (lead.location && lead.location.toLowerCase().includes(this.filters.location));

            const courseMatch = !this.filters.course ||
                (lead.classLevel && lead.classLevel.toLowerCase().includes(this.filters.course));

            const subMatch = !this.filters.subject ||
                (lead.subjects && lead.subjects.some((s: string) => s.toLowerCase().includes(this.filters.subject)));

            const modeMatch = !this.filters.mode ||
                (lead.mode && lead.mode.toLowerCase() === this.filters.mode);

            return locMatch && courseMatch && subMatch && modeMatch;
        });
    }

    clearFilters() {
        this.filters = { location: '', pincode: '', course: '', subject: '', mode: '' };
        this.resolvedArea = null;
        this.nearbyError = '';
        this.loadLeads();
    }

    unlockLead(lead: TutorLead) {
        if (lead.isUnlocked) return;
        if (this.unlockingId) return; // Prevent double-click

        if (!confirm(`Unlock "${lead.title}" for 1 Point?`)) return;

        this.unlockingId = lead._id;
        this.leadService.unlockLead(lead._id).subscribe({
            next: (res) => {
                lead.isUnlocked = true;
                lead.parentContact = res.parentContact;
                this.unlockingId = null;
                this.authService.refreshProfile().subscribe({ error: () => {} });
                this.notifications.success(res.message || 'Lead unlocked! Parent contact revealed.');
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.unlockingId = null;
                if (err.status === 403 || err.error?.error?.code === 'INSUFFICIENT_POINTS') {
                    this.notifications.info('Not enough points. Redirecting to buy points...');
                    setTimeout(() => this.router.navigate(['/tutor/buy-points']), 1500);
                } else if (err.status === 409) {
                    // Already unlocked - refresh to get parent contact
                    lead.isUnlocked = true;
                    if (err.error?.parentContact) lead.parentContact = err.error.parentContact;
                    this.notifications.info('Already unlocked!');
                } else {
                    this.notifications.error(apiErrorMessage(err, 'Unlock failed. Please try again.'));
                }
                this.cdr.detectChanges();
            }
        });
    }

    reportLead(lead: TutorLead) {
        if (!lead.isUnlocked || this.reportingId) return;
        const reason = this.reportReason[lead._id];
        if (!reason) {
            this.notifications.error('Choose a report reason first.');
            return;
        }
        if (!confirm('Submit this lead for admin review?')) return;

        this.reportingId = lead._id;
        this.leadService.reportLead(lead._id, reason, this.reportDetails[lead._id]).subscribe({
            next: (res) => {
                lead.reportSubmitted = true;
                this.reportingId = null;
                this.notifications.success(res.message || 'Report submitted.');
                this.cdr.detectChanges();
            },
            error: (err) => {
                if (err.status === 409) lead.reportSubmitted = true;
                this.reportingId = null;
                const message = apiErrorMessage(err, 'Could not submit report.');
                if (err.status === 409) this.notifications.info(message);
                else this.notifications.error(message);
                this.cdr.detectChanges();
            }
        });
    }
}
