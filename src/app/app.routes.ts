import { Routes } from '@angular/router';

import { Landing }        from './pages/landing/landing';
import { Login }          from './pages/auth/login/login';
import { Register }       from './pages/auth/register/register';
import { Home }           from './pages/home/home';
import { UserComponent }  from './pages/users/users';
import { GroupComponent } from './pages/group/group';

import { MainLayout } from './layout/main-layout/main-layout';

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
    children: [
      {
        path: 'home',
        component: Home
      },
      {
        path: 'group',
        component: GroupComponent
      },
      {
        path: 'user',
        component: UserComponent
      }
    ]
  }
];