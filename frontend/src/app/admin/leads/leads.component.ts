import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';

@Component({
    selector: 'app-admin-leads',
    standalone: true,
    imports: [CommonModule, FormsModule, AdminNavComponent],
    templateUrl: './leads.component.html',
    styleUrl: './leads.component.css'
})
export class AdminLeadsComponent implements OnInit {
    leads: any[] = [];
    loading = true;
    error = '';

    search = '';
    status = '';
    page = 1;
    pages = 1;
    total = 0;

    busyId: string | null = null;

    constructor(private adminService: AdminService, private cdr: ChangeDetectorRef) { }

    ngOnInit() {
        this.load();
    }

    load() {
        this.loading = true;
        this.error = '';
        this.adminService.getLeads({ search: this.search, status: this.status, page: this.page, limit: 20 }).subscribe({
            next: (data) => {
                this.leads = data.leads;
                this.total = data.total;
                this.pages = data.pages;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.error = 'Failed to load leads';
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    onFilterChange() {
        this.page = 1;
        this.load();
    }

    goToPage(p: number) {
        if (p < 1 || p > this.pages) return;
        this.page = p;
        this.load();
    }

    close(lead: any) {
        if (!confirm(`Close the lead "${lead.title}"?`)) return;
        this.busyId = lead._id;
        this.adminService.closeLead(lead._id).subscribe({
            next: () => {
                lead.status = 'CLOSED';
                this.busyId = null;
                this.cdr.detectChanges();
            },
            error: (err) => {
                alert(err?.error?.message || 'Failed to close lead');
                this.busyId = null;
                this.cdr.detectChanges();
            }
        });
    }

    remove(lead: any) {
        if (!confirm(`Permanently delete the lead "${lead.title}"? This cannot be undone.`)) return;
        this.busyId = lead._id;
        this.adminService.deleteLead(lead._id).subscribe({
            next: () => {
                this.leads = this.leads.filter(l => l._id !== lead._id);
                this.total -= 1;
                this.busyId = null;
                this.cdr.detectChanges();
            },
            error: (err) => {
                alert(err?.error?.message || 'Failed to delete lead');
                this.busyId = null;
                this.cdr.detectChanges();
            }
        });
    }
}
