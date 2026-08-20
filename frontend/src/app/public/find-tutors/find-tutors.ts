import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { PublicService } from '../../core/services/public.service';
import { API_CONFIG } from '../../core/api.config';
import { PublicTutor, ResolvedArea } from '../../core/models';
import { ChangeDetectorRef } from '@angular/core';
import { FilterSidebarComponent, FilterFieldConfig } from '../../shared/filter-sidebar/filter-sidebar.component';
import { TutorCardComponent } from '../../shared/tutor-card/tutor-card.component';

const PINCODE_RE = /^\d{6}$/;

@Component({
  selector: 'app-find-tutors',
  standalone: true,
  imports: [CommonModule, FilterSidebarComponent, TutorCardComponent],
  templateUrl: './find-tutors.html',
  styleUrl: './find-tutors.css',
})
export class FindTutors implements OnInit {
  tutors: PublicTutor[] = [];
  filteredTutors: PublicTutor[] = [];
  loading = true;
  filters = { location: '', pincode: '', subject: '', class: '', mode: '' };

  // Set once a valid pincode resolves to nearby results — non-null means the
  // base list below is scoped to that area instead of every tutor.
  nearbyTutors: PublicTutor[] | null = null;
  resolvedArea: ResolvedArea | null = null;
  nearbySearching = false;
  nearbyError = '';

  filterFields: FilterFieldConfig[] = [
    { key: 'location', label: 'Location / Area', type: 'text', placeholder: 'e.g. Gachibowli, Kukatpally' },
    { key: 'pincode', label: 'Pincode', type: 'text', placeholder: 'e.g. 500032' },
    { key: 'subject', label: 'Subject', type: 'text', placeholder: 'e.g. Mathematics, Physics' },
    { key: 'class', label: 'Class Level', type: 'text', placeholder: 'e.g. Class 10, JEE' },
    {
      key: 'mode', label: 'Teaching Mode', type: 'select', options: [
        { value: '', label: 'All Modes' },
        { value: 'online', label: 'Online' },
        { value: 'home', label: 'Home Tuition' },
        { value: 'both', label: 'Both' },
      ]
    },
  ];

  constructor(
    private publicService: PublicService,
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private cdr:ChangeDetectorRef,
  ) {}

  ngOnInit() {
    if (this.authService.getRole() === 'TUTOR') {
      this.router.navigate(['/tutor/leads']);
      return;
    }
    this.publicService.getTutors().subscribe({
      next: (data) => {
        this.tutors = data;
        this.filteredTutors = [...data];
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
        this.nearbyTutors = null;
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
    this.http.get<{ tutors: PublicTutor[]; area: ResolvedArea | null }>(`${API_CONFIG.baseUrl}/public/tutors/nearby?pincode=${pincode}`).subscribe({
      next: (res) => {
        this.nearbyTutors = res.tutors || [];
        this.resolvedArea = res.area || null;
        this.nearbySearching = false;
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: () => {
        this.nearbySearching = false;
        this.nearbyTutors = [];
        this.resolvedArea = null;
        this.nearbyError = 'Could not look up that pincode. Please try again.';
        this.applyFilters();
        this.cdr.detectChanges();
      }
    });
  }

  clearFilters() {
    this.filters = { location: '', pincode: '', subject: '', class: '', mode: '' };
    this.nearbyTutors = null;
    this.resolvedArea = null;
    this.nearbyError = '';
    this.filteredTutors = [...this.tutors];
  }

  applyFilters() {
    const baseList = this.nearbyTutors ?? this.tutors;
    this.filteredTutors = baseList.filter(tutor => {
      const locationMatch = !this.filters.location ||
        (tutor.location && tutor.location.toLowerCase().includes(this.filters.location));

      const subjectMatch = !this.filters.subject ||
        (tutor.subjects && tutor.subjects.some((s: string) => s.toLowerCase().includes(this.filters.subject)));

      const classMatch = !this.filters.class ||
        (tutor.subjects && tutor.subjects.some((s: string) => s.toLowerCase().includes(this.filters.class))) ||
        (tutor.tagline && tutor.tagline.toLowerCase().includes(this.filters.class));

      const modeMatch = !this.filters.mode ||
        (tutor.mode && tutor.mode.toLowerCase() === this.filters.mode);

      return locationMatch && subjectMatch && classMatch && modeMatch;
    });
  }
}
