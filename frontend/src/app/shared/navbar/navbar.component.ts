import { Component, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Observable, Subscription, map } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnDestroy {
  isLoggedIn$: Observable<boolean>;
  role$: Observable<string | null>;
  userName$: Observable<string>;

  mobileOpen = false;
  scrolled    = false;

  private sub: Subscription;

  constructor(private authService: AuthService) {
    this.isLoggedIn$ = this.authService.user$.pipe(map(u => !!u));
    this.role$       = this.authService.user$.pipe(map(u => u?.role ?? null));
    this.userName$   = this.authService.user$.pipe(map(u => u?.name ?? ''));

    // Close mobile menu on route changes
    this.sub = this.authService.user$.subscribe(() => {
      this.mobileOpen = false;
    });
  }

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled = window.scrollY > 20;
  }

  toggleMobile() {
    this.mobileOpen = !this.mobileOpen;
  }

  closeMobile() {
    this.mobileOpen = false;
  }

  logout() {
    this.authService.logout();
    this.closeMobile();
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
