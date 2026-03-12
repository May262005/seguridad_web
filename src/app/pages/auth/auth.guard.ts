// ─────────────────────────────────────────────
//  auth.guard.ts
// ─────────────────────────────────────────────
import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { Permission } from './auth.models';

/**
 * Guard genérico de autenticación
 */
export const authGuard: CanActivateFn = () => {

  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

/**
 * Guard por permiso
 */
export const permissionGuard = (permission: Permission): CanActivateFn =>
  (_route: ActivatedRouteSnapshot) => {

    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) {
      router.navigate(['/login']);
      return false;
    }

    if (auth.hasPermission(permission)) {
      return true;
    }

    router.navigate(['/app/home']);
    return false;
  };

/**
 * Guard solo superAdmin o con permiso de gestión de usuarios
 */
export const superAdminGuard: CanActivateFn = () => {

  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (auth.isSuperAdmin() || auth.hasPermission('user:manage-permissions') || auth.hasPermission('user:view')) {
    return true;
  }

  router.navigate(['/app/home']);
  return false;
};