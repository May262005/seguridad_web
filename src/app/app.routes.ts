import { Routes } from '@angular/router';

import { Landing }               from './pages/landing/landing';
import { Login }                 from './pages/login/login';
import { Register }              from './pages/register/register';
import { DashboardComponent }    from './pages/dashboard/dashboard';
import { UserComponent }         from './pages/users/users';
import { UserManagementComponent } from './pages/user-management/user-management';
import { GroupComponent }        from './pages/group/group';
import { TicketList }            from './pages/ticket-list/ticket-list';
import { TicketDetailComponent } from './pages/ticket-detail/ticket-detail';
import { MainLayout }            from './layout/main-layout/main-layout';

import { authGuard, permissionGuard, superAdminGuard } from './pages/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: Landing
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'register',
    component: Register
  },
  {
    path: 'app',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      {
        path: 'home',
        component: DashboardComponent
      },
      {
        path: 'group',
        canActivate: [permissionGuard('group:view')],
        component: GroupComponent
      },
      {
        path: 'user',
        component: UserComponent
      },
      {
        path: 'user-management',
        canActivate: [superAdminGuard],
        component: UserManagementComponent
      },
      {
        path: 'tickets',
        canActivate: [permissionGuard('ticket:view')],
        component: TicketList
      },
      {
        path: 'ticket/:id',
        canActivate: [permissionGuard('ticket:view')],
        component: TicketDetailComponent
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];