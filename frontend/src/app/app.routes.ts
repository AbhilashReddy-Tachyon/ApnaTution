import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { blockAdminGuard } from './core/guards/block-admin.guard';

/**
 * Every route is lazy. Eagerly importing components here put them in the
 * initial bundle regardless of whether a visitor ever reached them — the admin
 * dashboard and the whole landing stylesheet shipped to anonymous users.
 */
export const routes: Routes = [
    {
        path: '',
        title: 'ApnaTutors — Find the Perfect Tutor Near You',
        canActivate: [blockAdminGuard],
        loadComponent: () => import('./landing/landing').then(m => m.Landing),
    },
    {
        path: 'find-tutors',
        title: 'Find Tutors — ApnaTutors',
        canActivate: [blockAdminGuard],
        loadComponent: () => import('./public/find-tutors/find-tutors').then(m => m.FindTutors),
    },
    {
        path: 'find-students',
        title: 'Find Students — ApnaTutors',
        canActivate: [blockAdminGuard],
        loadComponent: () =>
            import('./public/find-students/find-students').then(m => m.FindStudentsComponent),
    },
    {
        path: 'terms',
        title: 'Terms & Conditions — ApnaTutors',
        canActivate: [blockAdminGuard],
        loadComponent: () => import('./public/terms/terms').then(m => m.TermsComponent),
    },
    {
        path: 'login',
        title: 'Sign In — ApnaTutors',
        canActivate: [blockAdminGuard],
        loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent),
    },
    {
        path: 'register',
        title: 'Create Account — ApnaTutors',
        canActivate: [blockAdminGuard],
        loadComponent: () =>
            import('./auth/register/register.component').then(m => m.RegisterComponent),
    },
    {
        path: 'forgot-password',
        title: 'Reset Password — ApnaTutors',
        canActivate: [blockAdminGuard],
        loadComponent: () =>
            import('./auth/forgot-password/forgot-password.component').then(
                m => m.ForgotPasswordComponent
            ),
    },
    {
        path: 'reset-password/:token',
        title: 'Set a New Password — ApnaTutors',
        canActivate: [blockAdminGuard],
        loadComponent: () =>
            import('./auth/reset-password/reset-password.component').then(
                m => m.ResetPasswordComponent
            ),
    },
    {
        path: 'dashboard',
        title: 'Dashboard — ApnaTutors',
        canActivate: [authGuard, blockAdminGuard],
        loadComponent: () =>
            import('./shared/dashboard/dashboard.component').then(m => m.DashboardComponent),
    },
    {
        path: 'profile',
        title: 'My Profile — ApnaTutors',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./shared/profile/profile.component').then(m => m.ProfileComponent),
    },

    // ── Parent ───────────────────────────────────────────────────────────────
    {
        path: 'parent/my-leads',
        title: 'My Requirements — ApnaTutors',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['PARENT'] },
        loadComponent: () =>
            import('./parent/my-leads/my-leads.component').then(m => m.MyLeadsComponent),
    },
    {
        path: 'parent/create-lead',
        title: 'Post a Requirement — ApnaTutors',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['PARENT'] },
        loadComponent: () =>
            import('./parent/create-lead/create-lead.component').then(m => m.CreateLeadComponent),
    },
    {
        path: 'parent/edit-lead/:id',
        title: 'Edit Requirement — ApnaTutors',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['PARENT'] },
        loadComponent: () =>
            import('./parent/create-lead/create-lead.component').then(m => m.CreateLeadComponent),
    },

    // ── Tutor ────────────────────────────────────────────────────────────────
    {
        path: 'tutor/leads',
        title: 'Browse Leads — ApnaTutors',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['TUTOR'] },
        loadComponent: () =>
            import('./tutor/lead-list/lead-list.component').then(m => m.LeadListComponent),
    },
    {
        path: 'tutor/buy-points',
        title: 'Buy Points — ApnaTutors',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['TUTOR'] },
        loadComponent: () =>
            import('./tutor/buy-points/buy-points.component').then(m => m.BuyPointsComponent),
    },
    {
        path: 'tutor/unlocked-leads',
        title: 'Unlocked Leads — ApnaTutors',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['TUTOR'] },
        loadComponent: () =>
            import('./tutor/unlocked-leads/unlocked-leads.component').then(
                m => m.UnlockedLeadsComponent
            ),
    },

    // ── Admin ────────────────────────────────────────────────────────────────
    {
        path: 'admin',
        title: 'Admin — ApnaTutors',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
            import('./admin/dashboard/dashboard.component').then(m => m.AdminDashboardComponent),
    },
    {
        path: 'admin/users',
        title: 'Manage Users — ApnaTutors',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () => import('./admin/users/users.component').then(m => m.AdminUsersComponent),
    },
    {
        path: 'admin/leads',
        title: 'Manage Leads — ApnaTutors',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () => import('./admin/leads/leads.component').then(m => m.AdminLeadsComponent),
    },
    {
        path: 'admin/payments',
        title: 'Manage Payments — ApnaTutors',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
            import('./admin/payments/payments.component').then(m => m.AdminPaymentsComponent),
    },

    // ── Terminal states ──────────────────────────────────────────────────────
    {
        path: 'forbidden',
        title: 'Access Denied — ApnaTutors',
        loadComponent: () =>
            import('./shared/status-page/status-page.component').then(m => m.StatusPageComponent),
        // Bound to the component's inputs by withComponentInputBinding().
        data: {
            code: '403',
            heading: 'Access denied',
            body: 'Your account does not have permission to view this page.',
        },
    },
    {
        path: '**',
        title: 'Page Not Found — ApnaTutors',
        loadComponent: () =>
            import('./shared/status-page/status-page.component').then(m => m.StatusPageComponent),
        data: {
            code: '404',
            heading: 'Page not found',
            body: 'The page you were looking for does not exist or has moved.',
        },
    },
];
