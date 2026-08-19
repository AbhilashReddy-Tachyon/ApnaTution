import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OtpService } from '../../core/services/otp.service';
import { SocialLoginComponent } from '../../shared/social-login/social-login.component';

const PHONE_RE = /^[6-9]\d{9}$/;

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SocialLoginComponent],
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.css']
})
export class RegisterComponent {
    registerForm: FormGroup;
    error: string = '';
    loading = false;
    showPassword = false;

    // Phone OTP verification (parents only)
    otpSending = false;
    otpSent = false;
    otpVerifying = false;
    otpVerified = false;
    otpValue = '';
    otpError = '';
    otpMessage = '';
    phoneToken: string | null = null;
    private otpVerifiedForPhone: string | null = null;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private otpService: OtpService,
        private router: Router
    ) {
        this.registerForm = this.fb.group({
            role:     ['', Validators.required],
            name:     ['', [Validators.required, Validators.minLength(2)]],
            email:    ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            phone:    [''],
            subjects: [''],
            location: [''],
            pincode:  ['', [Validators.pattern(/^\d{6}$/)]]
        });

        this.registerForm.get('role')?.valueChanges.subscribe(() => this.updatePhoneValidators());
        this.registerForm.get('phone')?.valueChanges.subscribe(() => this.onPhoneChanged());
    }

    get selectedRole() {
        return this.registerForm.get('role')?.value;
    }

    get phoneControl() {
        return this.registerForm.get('phone');
    }

    get isPhoneValidForOtp(): boolean {
        return PHONE_RE.test((this.phoneControl?.value || '').trim());
    }

    private updatePhoneValidators() {
        const phoneCtrl = this.registerForm.get('phone');
        if (this.selectedRole === 'PARENT') {
            phoneCtrl?.setValidators([Validators.required, Validators.pattern(PHONE_RE)]);
        } else {
            phoneCtrl?.setValidators([]);
        }
        phoneCtrl?.updateValueAndValidity();
    }

    private onPhoneChanged() {
        const phone = (this.phoneControl?.value || '').trim();
        if (phone !== this.otpVerifiedForPhone) {
            this.otpVerified = false;
            this.phoneToken = null;
            this.otpSent = false;
            this.otpValue = '';
            this.otpError = '';
            this.otpMessage = '';
        }
    }

    togglePassword() {
        this.showPassword = !this.showPassword;
    }

    onSocialAuthError(message: string) {
        this.error = message;
    }

    sendOtp() {
        const phone = (this.phoneControl?.value || '').trim();
        if (!PHONE_RE.test(phone)) {
            this.otpError = 'Enter a valid 10-digit mobile number first';
            return;
        }

        this.otpSending = true;
        this.otpError = '';
        this.otpMessage = '';
        this.otpService.sendOtp(phone).subscribe({
            next: (res) => {
                this.otpSending = false;
                this.otpSent = true;
                this.otpMessage = res.devMode ? 'OTP sent (dev mode — check server console)' : 'OTP sent to your mobile number';
            },
            error: (err) => {
                this.otpSending = false;
                this.otpError = err?.error?.message || 'Failed to send OTP. Please try again.';
            }
        });
    }

    verifyOtp() {
        const phone = (this.phoneControl?.value || '').trim();
        if (!this.otpValue.trim()) {
            this.otpError = 'Enter the OTP sent to your phone';
            return;
        }

        this.otpVerifying = true;
        this.otpError = '';
        this.otpService.verifyOtp(phone, this.otpValue.trim()).subscribe({
            next: (res) => {
                this.otpVerifying = false;
                this.otpVerified = true;
                this.otpVerifiedForPhone = phone;
                this.phoneToken = res.phoneToken;
                this.otpMessage = 'Mobile number verified';
            },
            error: (err) => {
                this.otpVerifying = false;
                this.otpError = err?.error?.message || 'Invalid or expired OTP';
            }
        });
    }

    onSubmit() {
        if (this.registerForm.invalid) {
            this.registerForm.markAllAsTouched();
            return;
        }
        if (this.selectedRole === 'PARENT' && !this.otpVerified) {
            this.error = 'Please verify your mobile number via OTP before creating your account.';
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
        if (formData.role === 'PARENT') {
            formData.phoneToken = this.phoneToken;
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
