import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { API_CONFIG } from '../../core/api.config';
import { FilterSidebarComponent, FilterFieldConfig } from '../../shared/filter-sidebar/filter-sidebar.component';

const PINCODE_RE = /^\d{6}$/;

@Component({
    selector: 'app-find-students',
    standalone: true,
    imports: [CommonModule, RouterLink, FilterSidebarComponent],
    templateUrl: './find-students.html',
    styleUrl: './find-students.css',
})
export class FindStudentsComponent implements OnInit {
    leads: any[] = [];
    filteredLeads: any[] = [];
    loading = true;
    filters = { location: '', pincode: '', subject: '', course: '', mode: '' };

    // Set once a valid pincode resolves to nearby results — non-null means the
    // base list below is scoped to that area instead of every open lead.
    nearbyLeads: any[] | null = null;
    resolvedArea: { name: string; district: string; state: string } | null = null;
    nearbySearching = false;
    nearbyError = '';

    filterFields: FilterFieldConfig[] = [
        { key: 'location', label: 'Location / Area', type: 'text', placeholder: 'e.g. Gachibowli, Kukatpally' },
        { key: 'pincode', label: 'Pincode', type: 'text', placeholder: 'e.g. 500032' },
        { key: 'course', label: 'Class / Course', type: 'text', placeholder: 'e.g. Class 10, JEE' },
        { key: 'subject', label: 'Subject', type: 'text', placeholder: 'e.g. Mathematics, Physics' },
        {
            key: 'mode', label: 'Teaching Mode', type: 'select', options: [
                { value: '', label: 'All Modes' },
                { value: 'online', label: 'Online' },
                { value: 'home', label: 'Home Tuition' },
                { value: 'both', label: 'Both' },
            ]
        },
    ];

    get resultsLabel(): string {
        return `${this.filteredLeads.length} requirement${this.filteredLeads.length !== 1 ? 's' : ''} found`;
    }

    constructor(
        private http: HttpClient,
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
        this.http.get<any[]>(`${API_CONFIG.baseUrl}/public/leads`).subscribe({
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

    onFilterChange(field: string, value: string) {
        if (field === 'pincode') {
            const pincode = value.trim();
            this.filters.pincode = pincode;
            if (PINCODE_RE.test(pincode)) {
                this.fetchNearby(pincode);
            } else {
                this.nearbyLeads = null;
                this.resolvedArea = null;
                this.nearbyError = '';
                this.applyFilters();
            }
            return;
        }
        this.filters[field as keyof typeof this.filters] = value.toLowerCase();
        this.applyFilters();
    }

    fetchNearby(pincode: string) {
        this.nearbySearching = true;
        this.nearbyError = '';
        this.http.get<any>(`${API_CONFIG.baseUrl}/public/leads/nearby?pincode=${pincode}`).subscribe({
            next: (res) => {
                this.nearbyLeads = res.leads || [];
                this.resolvedArea = res.area || null;
                this.nearbySearching = false;
                this.applyFilters();
                this.cdr.detectChanges();
            },
            error: () => {
                this.nearbySearching = false;
                this.nearbyLeads = [];
                this.resolvedArea = null;
                this.nearbyError = 'Could not look up that pincode. Please try again.';
                this.applyFilters();
                this.cdr.detectChanges();
            }
        });
    }

    applyFilters() {
        const baseList = this.nearbyLeads ?? this.leads;
        this.filteredLeads = baseList.filter(lead => {
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
        this.filters = { location: '', pincode: '', subject: '', course: '', mode: '' };
        this.nearbyLeads = null;
        this.resolvedArea = null;
        this.nearbyError = '';
        this.filteredLeads = [...this.leads];
    }
}
