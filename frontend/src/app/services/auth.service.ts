import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';

export type Permission =
  | 'group:view' | 'group:add' | 'group:edit' | 'group:delete' | 'group:manage-permissions' | 'group:users-add' | 'group:users-remove'
  | 'ticket:view' | 'ticket:create' | 'ticket:edit' | 'ticket:delete'
  | 'ticket:assign' | 'ticket:comment' | 'ticket:move' | 'ticket:status'
  | 'user:view' | 'user:create' | 'user:edit' | 'user:delete' | 'user:manage-permissions';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  nombre_completo: string;
  telefono: string;
  direccion: string;
  role?: string;
  permissions: Permission[];
  permisosPorGrupo: { [key: string]: Permission[] };
  groupIds: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000';

  constructor(
    private http: HttpClient,
    private cookieService: CookieService
  ) {}

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, credentials);
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, userData);
  }

  saveSession(loginData: any): void {
    this.cookieService.set('token', loginData.token, 1, '/');
    localStorage.setItem('user', JSON.stringify(loginData.user));
    localStorage.setItem('permissions', JSON.stringify(loginData.user.permisos || []));
    localStorage.setItem('permisosPorGrupo', JSON.stringify(loginData.user.permisosPorGrupo || {}));
    localStorage.setItem('userId', loginData.user.id);
  }

  getToken(): string | null {
    return this.cookieService.get('token');
  }

  getUser(): AuthUser | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  getPermissions(): Permission[] {
    const permissions = localStorage.getItem('permissions');
    return permissions ? JSON.parse(permissions) : [];
  }

  getPermisosPorGrupo(): { [key: string]: Permission[] } {
    const permisosPorGrupo = localStorage.getItem('permisosPorGrupo');
    return permisosPorGrupo ? JSON.parse(permisosPorGrupo) : {};
  }

  getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  getUserFullName(): string {
    const user = this.getUser();
    return user ? user.nombre_completo : '';
  }

  getUserAvatar(): string {
    const user = this.getUser();
    return user ? user.nombre_completo.charAt(0).toUpperCase() : 'U';
  }

  currentUser(): AuthUser | null {
    return this.getUser();
  }

  isSuperAdmin(): boolean {
    return this.hasPermission('user:manage-permissions');
  }

  // ── hasPermission ────────────────────────────────────────
  // Orden de revisión:
  //   1. Admin del sistema (user:manage-permissions global) → tiene todo
  //   2. Permiso global directo
  //   3. Si se pasa grupoId → revisa permisos de ese grupo específico
  //   4. Sin grupoId → revisa si tiene el permiso en CUALQUIER grupo
  hasPermission(permission: Permission, grupoId?: string): boolean {
    const globalPermissions = this.getPermissions();
    const permisosPorGrupo  = this.getPermisosPorGrupo();

    // 1. Admin del sistema
    if (globalPermissions.includes('user:manage-permissions')) return true;

    // 2. Permiso global directo
    if (globalPermissions.includes(permission)) return true;

    // 3. Permiso en el grupo específico
    if (grupoId) {
      const grupoPerms = permisosPorGrupo[grupoId] || [];
      return grupoPerms.includes(permission);
    }

    // 4. Tiene el permiso en algún grupo
    return Object.values(permisosPorGrupo).some(perms => perms.includes(permission));
  }

  hasAnyPermission(permissions: Permission[], grupoId?: string): boolean {
    return permissions.some(p => this.hasPermission(p, grupoId));
  }

  hasAllPermissions(permissions: Permission[], grupoId?: string): boolean {
    return permissions.every(p => this.hasPermission(p, grupoId));
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    this.cookieService.delete('token', '/');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    localStorage.removeItem('permisosPorGrupo');
    localStorage.removeItem('userId');
  }

  // ── refreshPermisos ──────────────────────────────────────
  // Recarga en caliente SIN relogin:
  //   - Permisos globales del usuario  → /users/:id/permisos
  //   - Grupos del usuario             → /groups/user/:id
  //   - Permisos por grupo             → /groups/:gId/users/:id/permisos
  // Actualiza localStorage para que hasPermission los use de inmediato.
  // Si algo falla, usa lo que ya hay guardado (no bloquea la app).
  async refreshPermisos(): Promise<void> {
  const userId = this.getUserId();
  const token  = this.getToken();
  if (!userId || !token) return;

  const headers = { Authorization: `Bearer ${token}` };

  try {
    const permisosRes: any = await firstValueFrom(
      this.http.get(`${this.apiUrl}/users/${userId}/permisos`, { headers })
    ).catch(() => null);

    if (permisosRes?.statusCode === 200 && permisosRes?.data) {
      const permisos = permisosRes.data.map((p: any) => p.nombre);
      localStorage.setItem('permissions', JSON.stringify(permisos));
    }

    const gruposRes: any = await firstValueFrom(
      this.http.get(`${this.apiUrl}/groups/user/${userId}`, { headers })
    ).catch(() => null);

    if (gruposRes?.statusCode === 200 && gruposRes?.data) {
      const grupos = gruposRes.data;
      const permisosPorGrupo: { [key: string]: string[] } = {};

      await Promise.all(
        grupos.map(async (g: any) => {
          try {
            const gPermRes: any = await firstValueFrom(
              this.http.get(`${this.apiUrl}/groups/${g.id}/users/${userId}/permisos`, { headers })
            );
            permisosPorGrupo[g.id] = (gPermRes?.statusCode === 200 && gPermRes?.data)
              ? gPermRes.data.map((p: any) => p.nombre)
              : [];
          } catch {
            permisosPorGrupo[g.id] = [];
          }
        })
      );

      localStorage.setItem('permisosPorGrupo', JSON.stringify(permisosPorGrupo));
    }
  } catch (err) {
    console.warn('refreshPermisos: usando cache local', err);
  }
}
}