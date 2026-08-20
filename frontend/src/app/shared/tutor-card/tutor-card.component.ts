import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicTutor } from '../../core/models';

/**
 * One tutor, rendered identically wherever tutors are listed — the landing
 * page's featured strip and the /find-tutors directory both use this, so the
 * two can't drift apart.
 */
@Component({
    selector: 'app-tutor-card',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './tutor-card.component.html',
    styleUrl: './tutor-card.component.css',
})
export class TutorCardComponent {
    @Input({ required: true }) tutor!: PublicTutor;

    /** The call to action differs by page, the card body never does. */
    @Input() ctaLabel = 'Post Requirement';
    @Input() ctaLink = '/register';

    /** How many subject chips fit before the rest collapse into "+N". */
    @Input() subjectLimit = 3;

    get visibleSubjects(): readonly string[] {
        return this.tutor.subjects.slice(0, this.subjectLimit);
    }

    get hiddenSubjects(): readonly string[] {
        return this.tutor.subjects.slice(this.subjectLimit);
    }

    /**
     * Whether a rate should carry a "/hr" suffix. `hourlyRate` is free text, so
     * it can hold "₹800" or "Negotiable" — only the former reads as a rate.
     */
    get hasNumericRate(): boolean {
        const rate = this.tutor.hourlyRate;
        return !!rate && /\d/.test(rate);
    }

    get modeLabel(): string {
        if (this.tutor.mode === 'BOTH') return 'Online + Home';
        if (this.tutor.mode === 'HOME') return 'Home visit';
        return 'Online';
    }
}
