// ─────────────────────────────────────────────
//  auth.service.ts
// ─────────────────────────────────────────────
import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthUser, Permission, Role, SessionPayload } from './auth.models';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  superAdmin: [
    'admin:full',
    'group:view', 'group:add', 'group:edit', 'group:delete',
    'ticket:view', 'ticket:create', 'ticket:edit', 'ticket:delete',
    'ticket:assign', 'ticket:comment', 'ticket:status',
    'user:view', 'user:create', 'user:edit', 'user:delete', 'user:manage-permissions',
  ],
  groupAdmin: [
    'group:view', 'group:add', 'group:edit', 'group:delete',
    'ticket:view', 'ticket:create', 'ticket:edit', 'ticket:delete',
    'ticket:assign', 'ticket:comment', 'ticket:status',
  ],
  member: [
    'ticket:view', 'ticket:comment', 'ticket:status',
  ],
  readonly: [
    'ticket:view',
  ],
};

const DEMO_USERS: AuthUser[] = [
  {
    id: 1,
    email: 'superadmin@app.com',
    password: 'SuperAdmin@12345',
    username: 'superadmin',
    fullName: 'Super Administrador',
    phone: '5500000001',
    address: 'Calle Central 1',
    birthDate: new Date('1990-01-01'),
    role: 'superAdmin',
    permissions: [...ROLE_PERMISSIONS['superAdmin']],
    groupIds: [1, 2, 3],
    avatar: 'SA',
  },
  {
    id: 2,
    email: 'admin@app.com',
    password: 'Admin@12345',
    username: 'admin',
    fullName: 'Administrador de Grupo',
    phone: '5500000002',
    address: 'Calle Admin 2',
    birthDate: new Date('1992-05-15'),
    role: 'groupAdmin',
    permissions: [...ROLE_PERMISSIONS['groupAdmin']],
    groupIds: [1, 2],
    avatar: 'AG',
  },
  {
    id: 3,
    email: 'miembro@app.com',
    password: 'Miembro@12345',
    username: 'miembro',
    fullName: 'Miembro del Equipo',
    phone: '5500000003',
    address: 'Calle Miembro 3',
    birthDate: new Date('1998-08-20'),
    role: 'member',
    permissions: [...ROLE_PERMISSIONS['member']],
    groupIds: [1],
    avatar: 'ME',
  },
];

const SESSION_KEY = 'auth_session';
const USERS_PERMISSIONS_KEY = 'users_permissions';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  private _currentUser = signal<AuthUser | null>(null);
  private _isLoading = signal<boolean>(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  readonly userRole = computed(() => this._currentUser()?.role ?? null);
  readonly isSuperAdmin = computed(() => this._currentUser()?.role === 'superAdmin');
  readonly isGroupAdmin = computed(() =>
    ['superAdmin', 'groupAdmin'].includes(this._currentUser()?.role ?? '')
  );
  readonly userAvatar = computed(() => this._currentUser()?.avatar ?? '??');
  readonly userFullName = computed(() => this._currentUser()?.fullName ?? '');
  readonly userGroupIds = computed(() => this._currentUser()?.groupIds ?? []);

  private _users: AuthUser[] = [...DEMO_USERS];
  private _userPermissionsOverrides: Map<number, Permission[]> = new Map();

  constructor() {
    this.loadPermissionsOverrides();
    this.restoreSession();
  }

  // ─────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────
  login(email: string, password: string): Promise<boolean> {

    this._isLoading.set(true);

    return new Promise(resolve => {

      setTimeout(() => {

        const user = this._users.find(
          u => u.email === email && u.password === password
        );

        if (user) {

          // Aplicar overrides de permisos si existen
          const overriddenPermissions = this._userPermissionsOverrides.get(user.id);
          const userWithPermissions = {
            ...user,
            permissions: overriddenPermissions ?? user.permissions
          };

          this._currentUser.set(userWithPermissions);
          this.saveSession(userWithPermissions);

          this._isLoading.set(false);
          resolve(true);

        } else {

          this._isLoading.set(false);
          resolve(false);

        }

      }, 600);

    });

  }

  // ─────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────
  logout(): void {

    this._currentUser.set(null);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(SESSION_KEY);
    }

    this.router.navigate(['/login']);

  }

  // ─────────────────────────────────────────────
  // PERMISSIONS
  // ─────────────────────────────────────────────
  hasPermission(permission: Permission): boolean {

    const user = this._currentUser();

    if (!user) return false;

    if (user.permissions.includes('admin:full')) return true;

    return user.permissions.includes(permission);

  }

  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(p => this.hasPermission(p));
  }

  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(p => this.hasPermission(p));
  }

  // ─────────────────────────────────────────────
  // USER MANAGEMENT (SUPER ADMIN)
  // ─────────────────────────────────────────────
  
  /**
   * Obtener todos los usuarios
   */
  getAllUsers(): AuthUser[] {
    return this._users.map(user => ({
      ...user,
      permissions: this._userPermissionsOverrides.get(user.id) ?? user.permissions
    }));
  }

  /**
   * Obtener un usuario por ID
   */
  getUserById(userId: number): AuthUser | undefined {
    const user = this._users.find(u => u.id === userId);
    if (!user) return undefined;
    
    return {
      ...user,
      permissions: this._userPermissionsOverrides.get(userId) ?? user.permissions
    };
  }

  /**
   * Actualizar permisos de un usuario
   */
  updateUserPermissions(userId: number, permissions: Permission[]): boolean {
    
    const user = this._users.find(u => u.id === userId);
    
    if (!user) return false;

    // Guardar en el override map
    this._userPermissionsOverrides.set(userId, permissions);
    
    // Persistir en localStorage
    this.savePermissionsOverrides();

    // Si es el usuario actual, actualizar su sesión
    const currentUser = this._currentUser();
    if (currentUser && currentUser.id === userId) {
      const updatedUser = { ...currentUser, permissions };
      this._currentUser.set(updatedUser);
      this.saveSession(updatedUser);
    }

    return true;
  }

  /**
   * Agregar permisos a un usuario
   */
  grantPermissionToUser(userId: number, permission: Permission): boolean {
    const user = this.getUserById(userId);
    if (!user || user.permissions.includes(permission)) return false;

    const updatedPermissions = [...user.permissions, permission];
    return this.updateUserPermissions(userId, updatedPermissions);
  }

  /**
   * Remover permisos de un usuario
   */
  revokePermissionFromUser(userId: number, permission: Permission): boolean {
    const user = this.getUserById(userId);
    if (!user || !user.permissions.includes(permission)) return false;

    const updatedPermissions = user.permissions.filter(p => p !== permission);
    return this.updateUserPermissions(userId, updatedPermissions);
  }

  /**
   * Restablecer permisos de un usuario a los predeterminados de su rol
   */
  resetUserPermissionsToRole(userId: number): boolean {
    const user = this._users.find(u => u.id === userId);
    if (!user) return false;

    const defaultPermissions = ROLE_PERMISSIONS[user.role];
    this._userPermissionsOverrides.delete(userId);
    
    // Persistir cambio
    this.savePermissionsOverrides();

    // Si es el usuario actual, actualizar su sesión
    const currentUser = this._currentUser();
    if (currentUser && currentUser.id === userId) {
      const updatedUser = { ...currentUser, permissions: defaultPermissions };
      this._currentUser.set(updatedUser);
      this.saveSession(updatedUser);
    }

    return true;
  }

  // ─────────────────────────────────────────────
  // SAVE SESSION
  // ─────────────────────────────────────────────
  private saveSession(user: AuthUser): void {

    if (!isPlatformBrowser(this.platformId)) return;

    const payload: SessionPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      groupIds: user.groupIds,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));

  }

  // ─────────────────────────────────────────────
  // PERMISSIONS OVERRIDES
  // ─────────────────────────────────────────────
  private savePermissionsOverrides(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const overridesObj: Record<string, Permission[]> = {};
    this._userPermissionsOverrides.forEach((permissions, userId) => {
      overridesObj[userId] = permissions;
    });

    localStorage.setItem(USERS_PERMISSIONS_KEY, JSON.stringify(overridesObj));
  }

  private loadPermissionsOverrides(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const raw = localStorage.getItem(USERS_PERMISSIONS_KEY);
      if (!raw) return;

      const overridesObj = JSON.parse(raw);
      Object.entries(overridesObj).forEach(([userId, permissions]: [string, any]) => {
        this._userPermissionsOverrides.set(parseInt(userId), permissions);
      });
    } catch {
      // Si hay error, simplemente no cargar los overrides
      this._userPermissionsOverrides.clear();
    }
  }

  // ─────────────────────────────────────────────
  // RESTORE SESSION
  // ─────────────────────────────────────────────
  private restoreSession(): void {

    if (!isPlatformBrowser(this.platformId)) return;

    const raw = localStorage.getItem(SESSION_KEY);

    if (!raw) return;

    try {

      const payload: SessionPayload = JSON.parse(raw);

      const user = this._users.find(u => u.id === payload.userId);

      if (user) {
        // Aplicar overrides de permisos si existen
        const overriddenPermissions = this._userPermissionsOverrides.get(user.id);
        const userWithPermissions = {
          ...user,
          permissions: overriddenPermissions ?? user.permissions
        };
        this._currentUser.set(userWithPermissions);
      }

    } catch {

      localStorage.removeItem(SESSION_KEY);

    }

  }

}