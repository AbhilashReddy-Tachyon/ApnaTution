import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SocialLoginComponent } from '../../shared/social-login/social-login.component';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, SocialLoginComponent],
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.css']
})
export class RegisterComponent {
    registerForm: FormGroup;
    error: string = '';
    loading = false;
    showPassword = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router
    ) {
        this.registerForm = this.fb.group({
            role:     ['', Validators.required],
            name:     ['', [Validators.required, Validators.minLength(2)]],
            email:    ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            phone:    [''],
            subjects: [''],
            location: ['']
        });
    }

    get selectedRole() {
        return this.registerForm.get('role')?.value;
    }

    togglePassword() {
        this.showPassword = !this.showPassword;
    }

    onSocialAuthError(message: string) {
        this.error = message;
    }

    onSubmit() {
        if (this.registerForm.invalid) {
            this.registerForm.markAllAsTouched();
            return;
        }

        this.loading = true;
        this.error = '';

        const formData = { ...this.registerForm.value };
        if (formData.role === 'TUTOR' && formData.subjects) {
            formData.subjects = formData.subjects
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean);
        }

        this.authService.register(formData).subscribe({
            next: () => {
                this.loading = false;
                this.router.navigate(['/login'], {
                    queryParams: { registered: '1' }
                });
            },
            error: (err) => {
                this.loading = false;
                this.error = err.error?.message || 'Registration failed. Please try again.';
            }
        });
    }
}
