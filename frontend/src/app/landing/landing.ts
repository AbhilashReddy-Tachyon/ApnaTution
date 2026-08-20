import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';
import { PublicService } from '../core/services/public.service';
import { PublicLead, PublicStats, PublicTutor } from '../core/models';
import { TutorCardComponent } from '../shared/tutor-card/tutor-card.component';
import { LeadCardComponent } from '../shared/lead-card/lead-card.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TutorCardComponent, LeadCardComponent],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing implements OnInit {
  userRole: string | null = null;
  userName: string = '';
  activeTab: 'PARENT' | 'TUTOR' = 'PARENT';

  stats: PublicStats = { tutors: 0, students: 0, activeLeads: 0 };
  leads:  PublicLead[] = [];
  tutors: PublicTutor[] = [];

  searchCity    = '';
  searchSubject = '';

  readonly popularSubjects = [
    { name: 'Mathematics',    icon: 'fa-square-root-variable', color: '#4f46e5' },
    { name: 'Physics',        icon: 'fa-atom',                 color: '#0891b2' },
    { name: 'Chemistry',      icon: 'fa-flask',                color: '#16a34a' },
    { name: 'Biology',        icon: 'fa-leaf',                 color: '#15803d' },
    { name: 'English',        icon: 'fa-book-open',            color: '#7c3aed' },
    { name: 'Hindi',          icon: 'fa-language',             color: '#dc2626' },
    { name: 'JEE Prep',       icon: 'fa-rocket',               color: '#ea580c' },
    { name: 'NEET Prep',      icon: 'fa-stethoscope',          color: '#059669' },
    { name: 'Computer Sci.',  icon: 'fa-laptop-code',          color: '#2563eb' },
    { name: 'Social Studies', icon: 'fa-globe-asia',           color: '#d97706' },
    { name: 'Accountancy',    icon: 'fa-calculator',           color: '#9333ea' },
    { name: 'Music',          icon: 'fa-music',                color: '#e11d48' },
  ];

  readonly topCities = [
    { name: 'Banjara Hills',  icon: 'fa-mountain-sun' },
    { name: 'Jubilee Hills',  icon: 'fa-city' },
    { name: 'Gachibowli',     icon: 'fa-building' },
    { name: 'Madhapur',       icon: 'fa-laptop-code' },
    { name: 'Kukatpally',     icon: 'fa-archway' },
    { name: 'Secunderabad',   icon: 'fa-monument' },
    { name: 'Kondapur',       icon: 'fa-fort-awesome' },
    { name: 'Miyapur',        icon: 'fa-umbrella-beach' },
  ];

  private readonly allTestimonials = [
    {
      name:    'Priya Sharma',
      role:    'Parent, Banjara Hills',
      avatar:  'PS',
      forRole: 'PARENT',
      rating:  5,
      text:    'Found an amazing Math tutor for my Class 10 daughter within 2 days. The platform is so easy to use — no middlemen, direct contact!',
    },
    {
      name:    'Rohit Verma',
      role:    'Tutor, Gachibowli',
      avatar:  'RV',
      forRole: 'TUTOR',
      rating:  5,
      text:    'I\'ve been using ApnaTutors for 6 months now. It\'s by far the best platform to find genuine students. Worth every point I spend!',
    },
    {
      name:    'Ananya Singh',
      role:    'Parent, Jubilee Hills',
      avatar:  'AS',
      forRole: 'PARENT',
      rating:  5,
      text:    'My son needed a NEET tutor urgently. Got 3 calls within 24 hours! The quality of tutors on this platform is outstanding.',
    },
    {
      name:    'Kiran Patel',
      role:    'Tutor, Kukatpally',
      avatar:  'KP',
      forRole: 'TUTOR',
      rating:  5,
      text:    'ApnaTutors changed my freelance teaching career. I get 5-6 serious inquiries every week — real parents, no fake leads.',
    },
  ];

  private readonly parentFeatures = [
    { icon: 'fa-shield-halved', cls: 'fi-blue',   title: 'Verified Tutors',    desc: 'Every tutor profile is reviewed for quality. You only connect with qualified educators.' },
    { icon: 'fa-rupee-sign',    cls: 'fi-green',  title: 'Free for Parents',   desc: 'Post any requirement at zero cost. Tutors pay a small unlock fee — you never pay anything.' },
    { icon: 'fa-bolt',          cls: 'fi-orange', title: 'Fast Connections',   desc: 'No slow agencies or long waits. Tutors reach out directly within hours of your post.' },
    { icon: 'fa-location-dot',  cls: 'fi-purple', title: 'Local or Online',    desc: 'Choose home tuition nearby or online sessions from top tutors across Hyderabad.' },
    { icon: 'fa-star',          cls: 'fi-red',    title: 'All Boards & Exams', desc: 'CBSE, ICSE, State Boards, IB, JEE, NEET, UPSC — we cover every curriculum and exam.' },
    { icon: 'fa-lock',          cls: 'fi-teal',   title: '100% Privacy',       desc: 'Your contact details stay private until a tutor pays to unlock — no cold calls or spam.' },
  ];

  private readonly tutorFeatures = [
    { icon: 'fa-magnifying-glass', cls: 'fi-blue',   title: 'High-Quality Leads',   desc: 'Every lead is posted by a genuine parent with real requirements. No junk or bots.' },
    { icon: 'fa-coins',            cls: 'fi-orange', title: 'Pay Only to Connect',   desc: 'Spend 1 point to unlock a lead. No monthly fee, no commission — pay only when you connect.' },
    { icon: 'fa-mobile-screen',    cls: 'fi-green',  title: 'Direct Parent Contact', desc: 'Get the parent\'s phone and email instantly. No middlemen — talk directly to families.' },
    { icon: 'fa-chart-line',       cls: 'fi-purple', title: 'Grow Your Business',    desc: 'Build a steady roster of students. Tutors on our platform grow their income by 3× in 6 months.' },
    { icon: 'fa-location-dot',     cls: 'fi-red',    title: 'City-Wide Reach',       desc: 'Access leads from your area or go online and reach students from across Hyderabad.' },
    { icon: 'fa-star',             cls: 'fi-teal',   title: 'All Boards & Exams',    desc: 'CBSE, ICSE, JEE, NEET, State Boards — we have requirements for every subject you teach.' },
  ];

  private readonly guestFeatures = [
    { icon: 'fa-shield-halved', cls: 'fi-blue',   title: 'Verified Tutors',    desc: 'Every tutor profile is reviewed for quality. You only connect with qualified educators.' },
    { icon: 'fa-rupee-sign',    cls: 'fi-green',  title: 'Free for Parents',   desc: 'Post any requirement at zero cost. Tutors pay a small unlock fee — you never pay anything.' },
    { icon: 'fa-bolt',          cls: 'fi-orange', title: 'Fast Connections',   desc: 'No slow agencies or long waits. Tutors reach out directly within hours of your post.' },
    { icon: 'fa-location-dot',  cls: 'fi-purple', title: 'Local or Online',    desc: 'Choose home tuition nearby or online sessions from top tutors across Hyderabad.' },
    { icon: 'fa-star',          cls: 'fi-red',    title: 'All Boards & Exams', desc: 'CBSE, ICSE, State Boards, IB, JEE, NEET, UPSC — we cover every curriculum and exam.' },
    { icon: 'fa-lock',          cls: 'fi-teal',   title: '100% Privacy',       desc: 'Parent contact details stay private until a tutor pays to unlock — no cold calls or spam.' },
  ];

  constructor(
    private authService: AuthService,
    private publicService: PublicService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      this.userRole = user?.role ?? null;
      this.userName = user?.name ?? '';
      if (this.userRole === 'TUTOR') this.activeTab = 'TUTOR';
      else this.activeTab = 'PARENT';
    });
    this.fetchPublicData();
  }

  fetchPublicData() {
    forkJoin({
      stats:  this.publicService.getStats(),
      leads:  this.publicService.getLeads(),
      tutors: this.publicService.getTutors(),
    }).subscribe({
      next: ({ stats, leads, tutors }) => {
        this.stats  = stats;
        this.leads  = (leads  ?? []).slice(0, 6);
        this.tutors = (tutors ?? []).slice(0, 3);
        this.cdr.detectChanges();
      },
      error: err => console.error('Public data fetch failed', err),
    });
  }

  get dashboardLink(): string {
    return this.userRole ? '/dashboard' : '/login';
  }

  /**
   * A signed-in tutor can go straight to the lead list and spend a point;
   * everyone else has to register first.
   */
  get leadCtaLink(): string {
    return this.userRole === 'TUTOR' ? '/tutor/leads' : '/register';
  }

  get leadCtaLabel(): string {
    return this.userRole === 'TUTOR' ? 'Unlock Lead' : 'Register to Contact';
  }

  get featureCards() {
    if (this.userRole === 'PARENT') return this.parentFeatures;
    if (this.userRole === 'TUTOR')  return this.tutorFeatures;
    return this.guestFeatures;
  }

  get testimonials() {
    if (this.userRole === 'TUTOR') {
      return [...this.allTestimonials].sort((a, b) =>
        (b.forRole === 'TUTOR' ? 1 : 0) - (a.forRole === 'TUTOR' ? 1 : 0)
      );
    }
    if (this.userRole === 'PARENT') {
      return [...this.allTestimonials].sort((a, b) =>
        (b.forRole === 'PARENT' ? 1 : 0) - (a.forRole === 'PARENT' ? 1 : 0)
      );
    }
    return this.allTestimonials;
  }

  /** Average of the ratings actually shown, e.g. "5.0". */
  get avgRating(): string {
    const list = this.testimonials;
    if (!list.length) return '0.0';
    const sum = list.reduce((total, t) => total + t.rating, 0);
    return (sum / list.length).toFixed(1);
  }

  get reviewCount(): number {
    return this.testimonials.length;
  }

  setActiveTab(tab: 'PARENT' | 'TUTOR') {
    this.activeTab = tab;
  }

  onSearch() {
    this.router.navigate(['/find-tutors'], {
      queryParams: {
        city:    this.searchCity    || undefined,
        subject: this.searchSubject || undefined,
      },
    });
  }

  searchBySubject(subject: string) {
    this.router.navigate(['/find-tutors'], { queryParams: { subject } });
  }

  searchByCity(city: string) {
    this.router.navigate(['/find-tutors'], { queryParams: { city } });
  }
}
