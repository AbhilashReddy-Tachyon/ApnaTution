import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LeadService } from '../../core/services/lead.service';

@Component({
    selector: 'app-my-leads',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './my-leads.component.html',
    styleUrl: './my-leads.component.css'
})
export class MyLeadsComponent implements OnInit {
    leads: any[] = [];
    loading = true;
    interestedTutors: Record<string, any[]> = {};
    loadingInterestId: string | null = null;
    openInterestId: string | null = null;

    constructor(private leadService: LeadService,private cdr:ChangeDetectorRef) {}

    ngOnInit() {
        this.loadLeads();
    }

    loadLeads() {
        this.leadService.getMyLeads().subscribe({
            next: (data) => {
                this.leads = data;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
            }
        });
    }

    toggleInterestedTutors(lead: any) {
        if (this.openInterestId === lead._id) {
            this.openInterestId = null;
            return;
        }
        this.openInterestId = lead._id;
        if (this.interestedTutors[lead._id]) return;

        this.loadingInterestId = lead._id;
        this.leadService.getInterestedTutors(lead._id).subscribe({
            next: (data) => {
                this.interestedTutors[lead._id] = data;
                this.loadingInterestId = null;
                this.cdr.detectChanges();
            },
            error: () => {
                this.interestedTutors[lead._id] = [];
                this.loadingInterestId = null;
                this.cdr.detectChanges();
            }
        });
    }
}
