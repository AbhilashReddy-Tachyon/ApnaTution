import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PublicService } from '../../core/services/public.service';
import { PublicTutor } from '../../core/models';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-find-tutors',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './find-tutors.html',
  styleUrl: './find-tutors.css',
})
export class FindTutors implements OnInit {
  tutors: PublicTutor[] = [];
  filteredTutors: PublicTutor[] = [];
  loading = true;
  filters = { location: '', subject: '', class: '', mode: '' };

  constructor(
    private publicService: PublicService,
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

  onFilterChange(field: string, event: Event) {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value.toLowerCase();
    this.filters[field as keyof typeof this.filters] = value;
    this.applyFilters();
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
