import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Shared shell for terminal navigation outcomes (404, 403).
 *
 * Previously `**` redirected to the landing page and a wrong-role user was
 * bounced to `/` — in both cases the app silently pretended nothing happened.
 */
@Component({
    selector: 'app-status-page',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <main class="status-page">
            <p class="status-code">{{ code() }}</p>
            <h1>{{ heading() }}</h1>
            <p class="status-body">{{ body() }}</p>
            <a routerLink="/" class="btn btn-primary">Back to home</a>
        </main>
    `,
    styles: [
        `
            .status-page {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 0.75rem;
                min-height: 60vh;
                padding: 2rem 1.5rem;
                text-align: center;
            }

            .status-code {
                font-size: clamp(3rem, 12vw, 6rem);
                font-weight: 700;
                line-height: 1;
                margin: 0;
                color: #4f46e5;
            }

            .status-body {
                max-width: 32rem;
                color: #6b7280;
            }
        `,
    ],
})
export class StatusPageComponent {
    readonly code = input.required<string>();
    readonly heading = input.required<string>();
    readonly body = input.required<string>();
}
