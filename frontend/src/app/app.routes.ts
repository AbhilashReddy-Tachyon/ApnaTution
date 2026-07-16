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

import { Landing } from './landing/landing';

export const routes: Routes = [
    { path: '', component: Landing },
    { path: 'find-tutors', loadComponent: () => import('./public/find-tutors/find-tutors').then(m => m.FindTutors) },
    { path: 'find-students', loadComponent: () => import('./public/find-students/find-students').then(m => m.FindStudentsComponent) },
    { path: 'dashboard', canActivate: [AuthGuard], loadComponent: () => import('./shared/dashboard/dashboard.component').then(m => m.DashboardComponent) },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'forgot-password', component: ForgotPasswordComponent },
    { path: 'reset-password/:token', component: ResetPasswordComponent },
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
        path: 'tutor/unlocked-leads',
        loadComponent: () => import('./tutor/unlocked-leads/unlocked-leads.component').then(m => m.UnlockedLeadsComponent),
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
        path: 'profile',
        loadComponent: () => import('./shared/profile/profile.component').then(m => m.ProfileComponent),
        canActivate: [AuthGuard]
    },

    { path: '**', redirectTo: '' }
];
