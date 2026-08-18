import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { AdminService } from '../../core/services/admin.service';
import { DashboardSummary, UserRole } from '../../core/models';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
    userRole: UserRole | null = null;
    userName: string = '';
    stats: DashboardSummary | null = null;
    loading = true;

    constructor(
        private authService: AuthService,
        private dashboardService: DashboardService,
        private adminService: AdminService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.authService.user$.subscribe(user => {
            if (user) {
                this.userRole = user.role;
                this.userName = user.name || 'User';
                this.loadDashboardData();
            }
        });
    }

    loadDashboardData() {
        this.loading = true;

        const done = (data: DashboardSummary) => {
            this.stats = data;
            this.loading = false;
            this.cdr.detectChanges();
        };
        // The old fail handler never called detectChanges(), so under zoneless
        // change detection a failed request left the spinner on screen forever.
        const fail = () => { this.loading = false; this.cdr.detectChanges(); };

        if (this.userRole === 'PARENT') {
            this.dashboardService.getParentStats().subscribe({ next: done, error: fail });
        } else if (this.userRole === 'TUTOR') {
            this.dashboardService.getTutorStats().subscribe({ next: done, error: fail });
        } else if (this.userRole === 'ADMIN') {
            this.adminService.getStats().subscribe({ next: done, error: fail });
        }
        // (A trailing `this.cdr.detectChanges()` used to run here, synchronously,
        // before any of the above subscriptions could resolve — dead code.)
    }

    logout() {
        this.authService.logout();
    }
}
