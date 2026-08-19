import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './auth/reset-password/reset-password.component';
import { MyLeadsComponent } from './parent/my-leads/my-leads.component';
import { CreateLeadComponent } from './parent/create-lead/create-lead.component';
import { LeadListComponent } from './tutor/lead-list/lead-list.component';
import { AdminDashboardComponent } from './admin/dashboard/dashboard.component';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { blockAdminGuard } from './core/guards/block-admin.guard';

import { Landing } from './landing/landing';

export const routes: Routes = [
    { path: '', component: Landing, canActivate: [blockAdminGuard] },
    { path: 'find-tutors', canActivate: [blockAdminGuard], loadComponent: () => import('./public/find-tutors/find-tutors').then(m => m.FindTutors) },
    { path: 'find-students', canActivate: [blockAdminGuard], loadComponent: () => import('./public/find-students/find-students').then(m => m.FindStudentsComponent) },
    { path: 'terms', canActivate: [blockAdminGuard], loadComponent: () => import('./public/terms/terms').then(m => m.TermsComponent) },
    { path: 'dashboard', canActivate: [AuthGuard, blockAdminGuard], loadComponent: () => import('./shared/dashboard/dashboard.component').then(m => m.DashboardComponent) },
    { path: 'login', component: LoginComponent, canActivate: [blockAdminGuard] },
    { path: 'register', component: RegisterComponent, canActivate: [blockAdminGuard] },
    { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [blockAdminGuard] },
    { path: 'reset-password/:token', component: ResetPasswordComponent, canActivate: [blockAdminGuard] },
    {
        path: 'parent/my-leads',
        component: MyLeadsComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { role: 'PARENT' }
    },
    {
        path: 'parent/create-lead',
        component: CreateLeadComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { role: 'PARENT' }
    },
    {
        path: 'parent/edit-lead/:id',
        component: CreateLeadComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { role: 'PARENT' }
    },
    {
        path: 'tutor/leads',
        component: LeadListComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { role: 'TUTOR' }
    },
    {
        path: 'tutor/buy-points',
        loadComponent: () => import('./tutor/buy-points/buy-points.component').then(m => m.BuyPointsComponent),
        canActivate: [AuthGuard, RoleGuard],
        data: { role: 'TUTOR' }
    },
    {
        path: 'admin',
        component: AdminDashboardComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { role: 'ADMIN' }
    },
    {
        path: 'admin/users',
        loadComponent: () => import('./admin/users/users.component').then(m => m.AdminUsersComponent),
        canActivate: [AuthGuard, RoleGuard],
        data: { role: 'ADMIN' }
    },
    {
        path: 'admin/leads',
        loadComponent: () => import('./admin/leads/leads.component').then(m => m.AdminLeadsComponent),
        canActivate: [AuthGuard, RoleGuard],
        data: { role: 'ADMIN' }
    },
    {
        path: 'admin/payments',
        loadComponent: () => import('./admin/payments/payments.component').then(m => m.AdminPaymentsComponent),
        canActivate: [AuthGuard, RoleGuard],
        data: { role: 'ADMIN' }
    },

    {
        path: 'profile',
        loadComponent: () => import('./shared/profile/profile.component').then(m => m.ProfileComponent),
        canActivate: [AuthGuard]
    },

    { path: '**', redirectTo: '' }
];
