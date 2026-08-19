import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { LeadService } from '../../core/services/lead.service';

@Component({
    selector: 'app-create-lead',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './create-lead.component.html',
    styleUrl: './create-lead.component.css'
})
export class CreateLeadComponent implements OnInit {
    leadForm: FormGroup;
    isEditMode = false;
    leadId: string | null = null;
    loading = false;      // loading existing lead for edit
    submitting = false;   // form submission in progress
    errorMsg = '';

    constructor(
        private fb: FormBuilder,
        private leadService: LeadService,
        private router: Router,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef
    ) {
        this.leadForm = this.fb.group({
            title:       ['', Validators.required],
            subjects:    ['', Validators.required],
            classLevel:  ['', Validators.required],
            mode:        ['ONLINE', Validators.required],
            location:    [''],
            pincode:     ['', [Validators.pattern(/^\d{6}$/)]],
            budgetRange: [''],
            description: ['']
        });
    }

    ngOnInit() {
        this.leadId = this.route.snapshot.paramMap.get('id');
        if (this.leadId) {
            this.isEditMode = true;
            this.loadLeadData(this.leadId);
        }
    }

    loadLeadData(id: string) {
        this.loading = true;
        this.leadService.getLead(id).subscribe({
            next: (lead) => {
                const subjectsStr = Array.isArray(lead.subjects) ? lead.subjects.join(', ') : (lead.subjects || '');
                this.leadForm.patchValue({ ...lead, subjects: subjectsStr });
                this.loading = false;
                this.cdr.markForCheck();    
            },
            error: (err) => {
                this.loading = false;
                const msg = err.error?.message || 'Failed to load lead';
                this.errorMsg = msg;
                setTimeout(() => this.router.navigate(['/parent/my-leads']), 2000);
            }
        });
    }

    onSubmit() {
        if (this.leadForm.invalid) {
            this.leadForm.markAllAsTouched();
            return;
        }

        const formVal = this.leadForm.value;
        const subjectsArray = formVal.subjects
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);

        if (subjectsArray.length === 0) {
            this.errorMsg = 'Please enter at least one subject.';
            return;
        }

        const payload = { ...formVal, subjects: subjectsArray };
        this.submitting = true;
        this.errorMsg = '';

        if (this.isEditMode && this.leadId) {
            this.leadService.updateLead(this.leadId, payload).subscribe({
                next: () => {
                    this.submitting = false;
                    this.router.navigate(['/parent/my-leads']);
                },
                error: (err) => {
                    this.submitting = false;
                    this.errorMsg = err.error?.message || 'Failed to update. Please try again.';
                }
            });
        } else {
            this.leadService.createLead(payload).subscribe({
                next: () => {
                    this.submitting = false;
                    this.router.navigate(['/parent/my-leads']);
                },
                error: (err) => {
                    this.submitting = false;
                    this.errorMsg = err.error?.message || 'Failed to post requirement. Please try again.';
                }
            });
        }
    }
}
