import { Injectable, signal } from '@angular/core';

export type NotificationKind = 'success' | 'error' | 'info' | 'warning';

export interface AppNotification {
    readonly id: number;
    readonly kind: NotificationKind;
    readonly message: string;
    /** Shown small under the message — used for the backend's requestId. */
    readonly detail?: string;
}

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * One place for transient user feedback.
 *
 * State is a signal, not a plain field: this app runs zoneless, so a `setTimeout`
 * that mutates a plain property renders nothing. That is exactly why the old
 * per-component toasts appeared and then never disappeared.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
    private readonly items = signal<readonly AppNotification[]>([]);
    private nextId = 1;

    /** Read-only view for the host component. */
    readonly notifications = this.items.asReadonly();

    success(message: string, detail?: string): void {
        this.push('success', message, detail);
    }

    error(message: string, detail?: string): void {
        // Errors linger: they usually carry something the user must act on.
        this.push('error', message, detail, DEFAULT_TIMEOUT_MS * 2);
    }

    info(message: string, detail?: string): void {
        this.push('info', message, detail);
    }

    warning(message: string, detail?: string): void {
        this.push('warning', message, detail);
    }

    dismiss(id: number): void {
        this.items.update((current) => current.filter((n) => n.id !== id));
    }

    clear(): void {
        this.items.set([]);
    }

    private push(
        kind: NotificationKind,
        message: string,
        detail?: string,
        timeoutMs = DEFAULT_TIMEOUT_MS
    ): void {
        const id = this.nextId++;
        this.items.update((current) => [...current, { id, kind, message, detail }]);
        setTimeout(() => this.dismiss(id), timeoutMs);
    }
}
