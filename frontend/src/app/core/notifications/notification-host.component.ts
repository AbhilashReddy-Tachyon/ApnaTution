import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NotificationService } from './notification.service';

/**
 * Renders whatever NotificationService is holding. Mounted once in the app
 * shell; no component should build its own toast markup.
 */
@Component({
    selector: 'app-notification-host',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <!-- aria-live so screen readers announce feedback the moment it appears. -->
        <div class="toast-stack" role="status" aria-live="polite" aria-atomic="false">
            @for (item of notifications(); track item.id) {
                <div class="toast toast-{{ item.kind }}">
                    <span class="toast-message">{{ item.message }}</span>
                    @if (item.detail) {
                        <span class="toast-detail">{{ item.detail }}</span>
                    }
                    <button
                        type="button"
                        class="toast-close"
                        aria-label="Dismiss notification"
                        (click)="dismiss(item.id)"
                    >&times;</button>
                </div>
            }
        </div>
    `,
    styles: [
        `
            .toast-stack {
                position: fixed;
                top: 1rem;
                right: 1rem;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                max-width: min(24rem, calc(100vw - 2rem));
            }

            .toast {
                display: grid;
                grid-template-columns: 1fr auto;
                align-items: start;
                gap: 0.25rem 0.75rem;
                padding: 0.75rem 1rem;
                border-radius: 12px;
                border-left: 4px solid currentColor;
                background: #fff;
                box-shadow: 0 10px 40px rgb(0 0 0 / 12%);
                animation: toast-in 0.2s ease-out;
            }

            .toast-message {
                color: #111827;
                font-weight: 500;
                overflow-wrap: anywhere;
            }

            .toast-detail {
                grid-column: 1 / -1;
                color: #6b7280;
                font-size: 0.75rem;
            }

            .toast-close {
                background: none;
                border: none;
                cursor: pointer;
                font-size: 1.25rem;
                line-height: 1;
                color: #9ca3af;
                padding: 0;
            }

            .toast-close:hover {
                color: #374151;
            }

            .toast-success { color: #10b981; }
            .toast-error   { color: #ef4444; }
            .toast-warning { color: #f59e0b; }
            .toast-info    { color: #3b82f6; }

            @keyframes toast-in {
                from { opacity: 0; transform: translateY(-0.5rem); }
                to   { opacity: 1; transform: translateY(0); }
            }

            @media (prefers-reduced-motion: reduce) {
                .toast { animation: none; }
            }
        `,
    ],
})
export class NotificationHostComponent {
    private readonly service = inject(NotificationService);

    readonly notifications = this.service.notifications;

    dismiss(id: number): void {
        this.service.dismiss(id);
    }
}
