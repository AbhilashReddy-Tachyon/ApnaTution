import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PublicService } from '../../core/services/public.service';
import { PublicLead } from '../../core/models';

@Component({
    selector: 'app-find-students',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './find-students.html',
    styleUrl: './find-students.css',
})
export class FindStudentsComponent implements OnInit {
    leads: PublicLead[] = [];
    filteredLeads: PublicLead[] = [];
    loading = true;
    filters = { location: '', subject: '', course: '', mode: '' };

    constructor(
        private publicService: PublicService,
        private authService: AuthService,
        private router: Router,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit() {
        const role = this.authService.getRole();
        if (role === 'PARENT') {
            this.router.navigate(['/parent/my-leads']);
            return;
        }
        if (role === 'TUTOR') {
            this.router.navigate(['/tutor/leads']);
            return;
        }
        this.publicService.getLeads().subscribe({
            next: (data) => {
                this.leads = data;
                this.filteredLeads = [...data];
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
            }
        });
    }

    onFilterChange(field: string, event: Event) {
        const value = (event.target as HTMLInputElement | HTMLSelectElement).value.toLowerCase();
        this.filters[field as keyof typeof this.filters] = value;
        this.applyFilters();
    }

    applyFilters() {
        this.filteredLeads = this.leads.filter(lead => {
            const locationMatch = !this.filters.location ||
                (lead.location && lead.location.toLowerCase().includes(this.filters.location));

            const subjectMatch = !this.filters.subject ||
                (lead.subjects && lead.subjects.some((s: string) => s.toLowerCase().includes(this.filters.subject)));

            const courseMatch = !this.filters.course ||
                (lead.classLevel && lead.classLevel.toLowerCase().includes(this.filters.course));

            const modeMatch = !this.filters.mode ||
                (lead.mode && lead.mode.toLowerCase() === this.filters.mode);

            return locationMatch && subjectMatch && courseMatch && modeMatch;
        });
    }

    clearFilters() {
        this.filters = { location: '', subject: '', course: '', mode: '' };
        this.filteredLeads = [...this.leads];
    }
}
