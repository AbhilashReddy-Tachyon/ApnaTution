import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LeadService } from '../../core/services/lead.service';

const PINCODE_RE = /^\d{6}$/;

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
    filters = { location: '', pincode: '', course: '', subject: '', mode: '' };
    loadingLeads = false;
    unlockingId: string | null = null;
    toast: { message: string; type: 'success' | 'error' | 'info' } | null = null;

    // Set once a valid pincode resolves to an area — while active, allLeads
    // itself is scoped to that area/pincode instead of every open lead.
    resolvedArea: { name: string; district: string; state: string } | null = null;
    nearbyError = '';

    constructor(private leadService: LeadService, private router: Router, private cdr: ChangeDetectorRef) {}

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
                this.showToast('Failed to load leads. Please refresh.', 'error');
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

    private showToast(message: string, type: 'success' | 'error' | 'info') {
        this.toast = { message, type };
        setTimeout(() => this.toast = null, 4000);
    }
}
