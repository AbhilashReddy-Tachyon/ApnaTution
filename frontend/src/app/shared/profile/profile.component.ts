import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
    profileForm: FormGroup;
    loading = true;
    saving = false;
    userRole: string | null = null;
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
            pincode:    ['', [Validators.pattern(/^\d{6}$/)]],
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
            },
            error: (err) => {
                this.saving = false;
                this.showToast(err.error?.message || 'Update failed. Please try again.', 'error');
            }
        });
    }

    private showToast(message: string, type: 'success' | 'error') {
        this.toast = { message, type };
        setTimeout(() => this.toast = null, 4000);
    }
}
