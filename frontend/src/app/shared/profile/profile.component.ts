import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { apiErrorMessage } from '../../core/errors/api-error';
import { User, UserRole } from '../../core/models';

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
    userRole: UserRole | null = null;
    profile: User | null = null;
    emailOtp = '';
    phoneOtp = '';
    sendingChannel: 'email' | 'phone' | null = null;
    verifyingChannel: 'email' | 'phone' | null = null;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private notifications: NotificationService,
        private cdr: ChangeDetectorRef
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
                this.notifications.error('Failed to load profile. Please try again.');
                this.cdr.markForCheck();
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
                this.notifications.success('Profile updated successfully!');
                this.loadProfile();
            },
            error: (err) => {
                this.saving = false;
                this.notifications.error(apiErrorMessage(err, 'Update failed. Please try again.'));
                this.cdr.markForCheck();
            }
        });
    }

    requestOtp(channel: 'email' | 'phone') {
        this.sendingChannel = channel;
        this.authService.requestVerification(channel).subscribe({
            next: (res) => {
                this.sendingChannel = null;
                const devHint = res.devOtp ? ` Dev OTP: ${res.devOtp}` : '';
                this.notifications.success(`${res.message}${devHint}`);
                this.cdr.markForCheck();
            },
            error: (err) => {
                this.sendingChannel = null;
                this.notifications.error(apiErrorMessage(err, 'Could not send verification code.'));
                this.cdr.markForCheck();
            }
        });
    }

    verify(channel: 'email' | 'phone') {
        const otp = channel === 'email' ? this.emailOtp : this.phoneOtp;
        if (!otp.trim()) {
            this.notifications.error('Enter the verification code first.');
            return;
        }

        this.verifyingChannel = channel;
        this.authService.verifyOtp(channel, otp).subscribe({
            next: (res) => {
                this.verifyingChannel = null;
                this.emailOtp = channel === 'email' ? '' : this.emailOtp;
                this.phoneOtp = channel === 'phone' ? '' : this.phoneOtp;
                this.profile = res.user;
                this.notifications.success(res.message || 'Verified successfully.');
                this.loadProfile();
            },
            error: (err) => {
                this.verifyingChannel = null;
                this.notifications.error(apiErrorMessage(err, 'Verification failed.'));
                this.cdr.markForCheck();
            }
        });
    }
}
