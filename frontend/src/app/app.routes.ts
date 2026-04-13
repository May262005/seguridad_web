import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { AdminGroupsComponent } from './pages/grupos/admin-groups.component';
import { MainLayout } from './layout/main-layout/main-layout';
import { AuthGuard } from './pages/auth/auth.guard';
import { TicketsComponent } from './pages/tickets/tickets.component';
import { TicketDetailComponent } from './pages/tickets/ticket-detail.component'
import { AdminUsersComponent } from './pages/admin-users/admin-users.component';
import { ProfileComponent } from './pages/perfil/profile.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'app',
    component: MainLayout,
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'groups', component: AdminGroupsComponent },
      { path: 'tickets', component: TicketsComponent },
      { path: 'tickets/:id', component: TicketDetailComponent },
      { path: 'users', component: AdminUsersComponent },
      { path: 'profile', component: ProfileComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '/login' }
];