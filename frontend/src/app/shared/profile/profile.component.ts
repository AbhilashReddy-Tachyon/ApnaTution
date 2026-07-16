import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
    profileForm: FormGroup;
    loading = true;
    saving = false;
    userRole: string | null = null;
    profile: any = null;
    emailOtp = '';
    phoneOtp = '';
    sendingChannel: 'email' | 'phone' | null = null;
    verifyingChannel: 'email' | 'phone' | null = null;
    toast: { message: string; type: 'success' | 'error' } | null = null;

    constructor(private fb: FormBuilder, private authService: AuthService , private cdr: ChangeDetectorRef
    ) {
        this.profileForm = this.fb.group({
            name:       ['', [Validators.required, Validators.minLength(2)]],
            email:      [{ value: '', disabled: true }],
            role:       [{ value: '', disabled: true }],
            phone:      [''],
            // Tutor fields
            tagline:    [''],
            subjects:   [''],  // stored as comma-separated string, converted to array on save
            location:   [''],
            experience: [''],
            hourlyRate: [''],
            mode:       ['ONLINE']
        });
    }

    ngOnInit() {
        this.loadProfile();
    }

    loadProfile() {
        this.loading = true;
        this.authService.getProfile().subscribe({
            next: (user) => {
                this.profile = user;
                this.userRole = user.role;
                // Convert subjects array to comma-separated string for editing
                const subjectsStr = Array.isArray(user.subjects) ? user.subjects.join(', ') : (user.subjects || '');
                this.profileForm.patchValue({ ...user, subjects: subjectsStr });
                this.loading = false;
                this.cdr.markForCheck();        
            },
            error: () => {
                this.loading = false;
                this.showToast('Failed to load profile. Please try again.', 'error');
            }
        });
    }

    onSubmit() {
        if (this.profileForm.invalid) {
            this.profileForm.markAllAsTouched();
            return;
        }
        this.saving = true;
        const raw = this.profileForm.getRawValue();

        // Convert subjects string to array
        if (this.userRole === 'TUTOR' && raw.subjects) {
            raw.subjects = raw.subjects.split(',').map((s: string) => s.trim()).filter(Boolean);
        }

        this.authService.updateProfile(raw).subscribe({
            next: () => {
                this.saving = false;
                this.showToast('Profile updated successfully!', 'success');
                this.loadProfile();
            },
            error: (err) => {
                this.saving = false;
                this.showToast(err.error?.message || 'Update failed. Please try again.', 'error');
            }
        });
    }

    requestOtp(channel: 'email' | 'phone') {
        this.sendingChannel = channel;
        this.authService.requestVerification(channel).subscribe({
            next: (res) => {
                this.sendingChannel = null;
                const devHint = res.devOtp ? ` Dev OTP: ${res.devOtp}` : '';
                this.showToast(`${res.message}${devHint}`, 'success');
            },
            error: (err) => {
                this.sendingChannel = null;
                this.showToast(err.error?.message || 'Could not send verification code.', 'error');
            }
        });
    }

    verify(channel: 'email' | 'phone') {
        const otp = channel === 'email' ? this.emailOtp : this.phoneOtp;
        if (!otp.trim()) {
            this.showToast('Enter the verification code first.', 'error');
            return;
        }

        this.verifyingChannel = channel;
        this.authService.verifyOtp(channel, otp).subscribe({
            next: (res) => {
                this.verifyingChannel = null;
                this.emailOtp = channel === 'email' ? '' : this.emailOtp;
                this.phoneOtp = channel === 'phone' ? '' : this.phoneOtp;
                this.profile = res.user;
                this.showToast(res.message || 'Verified successfully.', 'success');
                this.loadProfile();
            },
            error: (err) => {
                this.verifyingChannel = null;
                this.showToast(err.error?.message || 'Verification failed.', 'error');
            }
        });
    }

    private showToast(message: string, type: 'success' | 'error') {
        this.toast = { message, type };
        setTimeout(() => this.toast = null, 4000);
    }
}
