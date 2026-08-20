import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicLead } from '../../core/models';

/**
 * One open tuition requirement, rendered identically wherever leads are
 * listed — the landing page's live-opportunities strip and the
 * /find-students directory both use this, so the two can't drift apart.
 */
@Component({
    selector: 'app-lead-card',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './lead-card.component.html',
    styleUrl: './lead-card.component.css',
})
export class LeadCardComponent {
    @Input({ required: true }) lead!: PublicLead;

    /** The call to action differs by page, the card body never does. */
    @Input() ctaLabel = 'Register to Contact';
    @Input() ctaLink = '/register';

    /** How many subject chips fit before the rest collapse into "+N". */
    @Input() subjectLimit = 3;

    get visibleSubjects(): readonly string[] {
        return this.lead.subjects.slice(0, this.subjectLimit);
    }

    get hiddenSubjects(): readonly string[] {
        return this.lead.subjects.slice(this.subjectLimit);
    }

    get modeLabel(): string {
        if (this.lead.mode === 'BOTH') return 'Online + Home';
        if (this.lead.mode === 'HOME') return 'Home visit';
        return 'Online';
    }

    /** "Today", "3d ago", "2w ago" — a fresh lead matters more than an exact date. */
    get postedAgo(): string {
        const days = this.daysOld;
        if (days === null) return 'Recent';
        if (days <= 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        if (days < 30) return `${Math.floor(days / 7)}w ago`;
        return `${Math.floor(days / 30)}mo ago`;
    }

    /** Flags leads posted in the last three days, where tutors have the best shot. */
    get isFresh(): boolean {
        const days = this.daysOld;
        return days !== null && days <= 3;
    }

    /** Days since the lead was posted, or null when the date is unusable. */
    private get daysOld(): number | null {
        const iso = this.lead.createdAt;
        if (!iso) return null;
        const then = new Date(iso).getTime();
        if (Number.isNaN(then)) return null;
        return Math.floor((Date.now() - then) / 86_400_000);
    }
}
