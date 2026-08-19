import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { API_CONFIG } from '../../core/api.config';
import { ChangeDetectorRef } from '@angular/core';
import { FilterSidebarComponent, FilterFieldConfig } from '../../shared/filter-sidebar/filter-sidebar.component';

@Component({
  selector: 'app-find-tutors',
  standalone: true,
  imports: [CommonModule, RouterLink, FilterSidebarComponent],
  templateUrl: './find-tutors.html',
  styleUrl: './find-tutors.css',
})
export class FindTutors implements OnInit {
  tutors: any[] = [];
  filteredTutors: any[] = [];
  loading = true;
  filters = { location: '', subject: '', class: '', mode: '' };

  filterFields: FilterFieldConfig[] = [
    { key: 'location', label: 'Location / City', type: 'text', placeholder: 'e.g. Mumbai, Delhi' },
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
    this.http.get<any[]>(`${API_CONFIG.baseUrl}/public/tutors`).subscribe({
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
    this.filters[field as keyof typeof this.filters] = value.toLowerCase();
    this.applyFilters();
  }

  clearFilters() {
    this.filters = { location: '', subject: '', class: '', mode: '' };
    this.filteredTutors = [...this.tutors];
  }

  applyFilters() {
    this.filteredTutors = this.tutors.filter(tutor => {
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
