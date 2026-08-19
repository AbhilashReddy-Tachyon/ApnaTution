import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';

@Component({
    selector: 'app-admin-users',
    standalone: true,
    imports: [CommonModule, FormsModule, AdminNavComponent],
    templateUrl: './users.component.html',
    styleUrl: './users.component.css'
})
export class AdminUsersComponent implements OnInit {
    users: any[] = [];
    loading = true;
    error = '';

    search = '';
    role = '';
    page = 1;
    pages = 1;
    total = 0;

    currentUserId: string | null = null;
    updatingId: string | null = null;

    constructor(
        private adminService: AdminService,
        private authService: AuthService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.currentUserId = this.authService.getUserFromToken()?.id || null;
        this.load();
    }

    load() {
        this.loading = true;
        this.error = '';
        this.adminService.getUsers({ search: this.search, role: this.role, page: this.page, limit: 20 }).subscribe({
            next: (data) => {
                this.users = data.users;
                this.total = data.total;
                this.pages = data.pages;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.error = 'Failed to load users';
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    onFilterChange() {
        this.page = 1;
        this.load();
    }

    goToPage(p: number) {
        if (p < 1 || p > this.pages) return;
        this.page = p;
        this.load();
    }

    toggleStatus(user: any) {
        const nextActive = !user.isActive;
        const verb = nextActive ? 'activate' : 'deactivate';
        if (!confirm(`Are you sure you want to ${verb} ${user.name}'s account?`)) return;

        this.updatingId = user._id;
        this.adminService.setUserStatus(user._id, nextActive).subscribe({
            next: (updated) => {
                user.isActive = updated.isActive;
                this.updatingId = null;
                this.cdr.detectChanges();
            },
            error: (err) => {
                alert(err?.error?.message || `Failed to ${verb} user`);
                this.updatingId = null;
                this.cdr.detectChanges();
            }
        });
    }
}
