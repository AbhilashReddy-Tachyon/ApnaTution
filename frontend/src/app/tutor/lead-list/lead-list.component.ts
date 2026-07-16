import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LeadService } from '../../core/services/lead.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-lead-list',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './lead-list.component.html',
    styleUrl: './lead-list.component.css'
})
export class LeadListComponent implements OnInit {
    allLeads: any[] = [];
    filteredLeads: any[] = [];
    filters = { location: '', course: '', subject: '', mode: '' };
    loadingLeads = false;
    unlockingId: string | null = null;
    reportingId: string | null = null;
    reportReason: Record<string, string> = {};
    reportDetails: Record<string, string> = {};
    toast: { message: string; type: 'success' | 'error' | 'info' } | null = null;

    constructor(
        private leadService: LeadService,
        private authService: AuthService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.loadLeads();
    }

    loadLeads() {
        this.loadingLeads = true;
        this.leadService.getLeadsForTutor().subscribe({
            next: (data) => {
                this.allLeads = data;
                this.filteredLeads = [...data];
                this.loadingLeads = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loadingLeads = false;
                this.showToast('Failed to load leads. Please refresh.', 'error');
                this.cdr.detectChanges();
            }
        });
    }

    onFilterChange(field: string, event: Event) {
        const value = (event.target as HTMLInputElement | HTMLSelectElement).value.toLowerCase();
        this.filters[field as keyof typeof this.filters] = value;
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
        this.filters = { location: '', course: '', subject: '', mode: '' };
        this.filteredLeads = [...this.allLeads];
    }

    unlockLead(lead: any) {
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
                this.showToast(res.message || 'Lead unlocked! Parent contact revealed.', 'success');
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.unlockingId = null;
                if (err.status === 403 || err.error?.code === 'INSUFFICIENT_POINTS') {
                    this.showToast('Not enough points. Redirecting to buy points...', 'info');
                    setTimeout(() => this.router.navigate(['/tutor/buy-points']), 1500);
                } else if (err.status === 409) {
                    // Already unlocked - refresh to get parent contact
                    lead.isUnlocked = true;
                    if (err.error?.parentContact) lead.parentContact = err.error.parentContact;
                    this.showToast('Already unlocked!', 'info');
                } else {
                    this.showToast(err.error?.message || 'Unlock failed. Please try again.', 'error');
                }
                this.cdr.detectChanges();
            }
        });
    }

    reportLead(lead: any) {
        if (!lead.isUnlocked || this.reportingId) return;
        const reason = this.reportReason[lead._id];
        if (!reason) {
            this.showToast('Choose a report reason first.', 'error');
            return;
        }
        if (!confirm('Submit this lead for admin review?')) return;

        this.reportingId = lead._id;
        this.leadService.reportLead(lead._id, reason, this.reportDetails[lead._id]).subscribe({
            next: (res) => {
                lead.reportSubmitted = true;
                this.reportingId = null;
                this.showToast(res.message || 'Report submitted.', 'success');
                this.cdr.detectChanges();
            },
            error: (err) => {
                if (err.status === 409) lead.reportSubmitted = true;
                this.reportingId = null;
                this.showToast(err.error?.message || 'Could not submit report.', err.status === 409 ? 'info' : 'error');
                this.cdr.detectChanges();
            }
        });
    }

    private showToast(message: string, type: 'success' | 'error' | 'info') {
        this.toast = { message, type };
        setTimeout(() => this.toast = null, 4000);
    }
}
