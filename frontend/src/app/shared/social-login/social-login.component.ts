import { Component, ElementRef, EventEmitter, Input, NgZone, OnDestroy, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SOCIAL_AUTH_CONFIG } from '../../core/social-auth.config';

declare const google: any;

const loadedScripts = new Set<string>();

function loadScript(src: string): Promise<void> {
  if (loadedScripts.has(src)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => { loadedScripts.add(src); resolve(); };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

@Component({
  selector: 'app-social-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './social-login.component.html',
  styleUrl: './social-login.component.css',
})
export class SocialLoginComponent implements OnDestroy {
  @Input() role: string | null = null;
  @Output() authError = new EventEmitter<string>();

  @ViewChild('googleBtn') googleBtnRef?: ElementRef<HTMLDivElement>;

  readonly googleEnabled = !!SOCIAL_AUTH_CONFIG.googleClientId;
  private destroyed = false;

  constructor(
    private authService: AuthService,
    private zone: NgZone,
    private router: Router,
  ) {
    if (this.googleEnabled) this.initGoogle();
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  private async initGoogle() {
    try {
      await loadScript('https://accounts.google.com/gsi/client');
      if (this.destroyed) return;
      google.accounts.id.initialize({
        client_id: SOCIAL_AUTH_CONFIG.googleClientId,
        callback: (response: any) => this.zone.run(() => this.handleGoogleCredential(response.credential)),
      });
      this.renderGoogleButton();
    } catch {
      this.authError.emit('Could not load Google sign-in. Check your connection and try again.');
    }
  }

  private renderGoogleButton() {
    if (!this.googleBtnRef || typeof google === 'undefined') return;
    this.googleBtnRef.nativeElement.innerHTML = '';
    google.accounts.id.renderButton(this.googleBtnRef.nativeElement, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      width: 320,
    });
  }

  private handleGoogleCredential(idToken: string) {
    this.authService.loginWithGoogle(idToken, this.role).subscribe({
      next: () => this.navigateAfterAuth(),
      error: (err) => this.authError.emit(err?.error?.message || 'Google sign-in failed. Please try again.'),
    });
  }

  private navigateAfterAuth() {
    const role = this.authService.getRole();
    if (role === 'PARENT')     this.router.navigate(['/parent/my-leads']);
    else if (role === 'TUTOR') this.router.navigate(['/tutor/leads']);
    else if (role === 'ADMIN') this.router.navigate(['/admin']);
    else                        this.router.navigate(['/dashboard']);
  }
}
