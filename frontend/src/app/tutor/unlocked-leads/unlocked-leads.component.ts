import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LeadService } from '../../core/services/lead.service';

@Component({
    selector: 'app-unlocked-leads',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './unlocked-leads.component.html',
    styleUrl: './unlocked-leads.component.css'
})
export class UnlockedLeadsComponent implements OnInit {
    leads: any[] = [];
    loading = true;
    error = '';

    constructor(private leadService: LeadService, private cdr: ChangeDetectorRef) {}

    ngOnInit(): void {
        this.loadLeads();
    }

    loadLeads(): void {
        this.loading = true;
        this.error = '';
        this.leadService.getUnlockedLeads().subscribe({
            next: (data) => {
                this.leads = data;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.error = err.error?.message || 'Could not load unlocked leads.';
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }
}
