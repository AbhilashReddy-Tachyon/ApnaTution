import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SocialLoginComponent } from '../../shared/social-login/social-login.component';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, SocialLoginComponent],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
    loginForm: FormGroup;
    error: string = '';
    loading = false;
    showPassword = false;
    successMessage = '';

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.loginForm = this.fb.group({
            email:    ['', [Validators.required, Validators.email]],
            password: ['', Validators.required]
        });
    }

    ngOnInit() {
        // Show success message if redirected after registration
        if (this.route.snapshot.queryParams['registered']) {
            this.successMessage = 'Account created! Please login to continue.';
        }
    }

    togglePassword() {
        this.showPassword = !this.showPassword;
    }

    onSocialAuthError(message: string) {
        this.error = message;
    }

    onSubmit() {
        if (this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return;
        }

        this.loading = true;
        this.error = '';

        this.authService.login(this.loginForm.value).subscribe({
            next: () => {
                this.loading = false;
                const role = this.authService.getRole();
                if (role === 'PARENT')     this.router.navigate(['/parent/my-leads']);
                else if (role === 'TUTOR') this.router.navigate(['/tutor/leads']);
                else if (role === 'ADMIN') this.router.navigate(['/admin']);
                else                        this.router.navigate(['/dashboard']);
            },
            error: (err) => {
                this.loading = false;
                this.error = err.error?.message || 'Invalid email or password.';
            }
        });
    }
}
