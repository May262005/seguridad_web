import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { AuthService } from '../auth/auth.service';
import { AuthUser, Permission } from '../auth/auth.models';

const ALL_PERMISSIONS: Permission[] = [
  'group:view', 'group:edit', 'group:delete',
  'ticket:view', 'ticket:create', 'ticket:edit', 'ticket:delete',
  'ticket:assign', 'ticket:comment', 'ticket:status',
  'user:view', 'user:edit',
];

const PERMISSION_GROUPS: Record<string, Permission[]> = {
  'Grupos': ['group:view', 'group:add', 'group:edit', 'group:delete'],
  'Tickets': ['ticket:view', 'ticket:create', 'ticket:edit', 'ticket:delete', 'ticket:assign', 'ticket:comment', 'ticket:status'],
  'Usuarios': ['user:view', 'user:edit'],
};

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, TableModule, InputTextModule, DialogModule,
    ToastModule, ConfirmDialogModule,
    AvatarModule, TagModule, TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css'
})
export class UserManagementComponent implements OnInit {

  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  auth = this.authService;

  users: AuthUser[] = [];
  selectedUser: AuthUser | null = null;
  allPermissionGroups: Record<string, Permission[]> = PERMISSION_GROUPS;
  editablePermissions: Permission[] = [];

  showPermissionsDialog = false;
  editingUserPermissions: Permission[] = [];
  editingUserId: number | null = null;

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.users = this.authService.getAllUsers()
      .filter(u => u.id !== this.authService.currentUser()?.id)
      .map(user => ({ ...user }));
  }

  openPermissionsDialog(user: AuthUser): void {
    if (!this.canManageUsers()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin permisos',
        detail: 'No tienes permiso para editar usuarios',
        life: 3000
      });
      return;
    }

    this.selectedUser = user;
    this.editingUserId = user.id;
    this.editablePermissions = ALL_PERMISSIONS;
    this.editingUserPermissions = [...user.permissions];

    this.showPermissionsDialog = true;
  }

  /**
   * Verifica si el usuario actual puede gestionar usuarios
   */
  canManageUsers(): boolean {
    if (this.authService.isSuperAdmin()) return true;
    return this.authService.hasAnyPermission([
      'user:manage-permissions',
      'user:edit',
      'user:create'
    ]);
  }

  /**
   * Todos los checkboxes habilitados si tiene permisos de gestión
   */
  canEditPermission(permission: Permission): boolean {
    // SuperAdmin puede todo
    if (this.authService.isSuperAdmin()) return true;
    // Cualquier usuario con permisos de gestión puede editar todos los permisos
    if (this.canManageUsers()) return true;
    return false;
  }

  getAllPermissionGroups(): Record<string, Permission[]> {
    return this.allPermissionGroups;
  }

  closePermissionsDialog(): void {
    this.showPermissionsDialog = false;
    this.selectedUser = null;
    this.editingUserPermissions = [];
    this.editingUserId = null;
    this.editablePermissions = [];
  }

  hasPermission(permission: Permission): boolean {
    return this.editingUserPermissions.includes(permission);
  }

  togglePermission(permission: Permission): void {
    if (!this.canEditPermission(permission)) return;

    const index = this.editingUserPermissions.indexOf(permission);
    if (index > -1) {
      this.editingUserPermissions.splice(index, 1);
    } else {
      this.editingUserPermissions.push(permission);
    }
  }

  savePermissions(): void {
    if (!this.editingUserId || !this.selectedUser) return;

    const success = this.authService.updateUserPermissions(
      this.editingUserId,
      this.editingUserPermissions
    );

    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Permisos actualizados correctamente',
        life: 3000
      });
      this.loadUsers();
      this.closePermissionsDialog();
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron actualizar los permisos',
        life: 3000
      });
    }
  }

  resetPermissions(): void {
    if (!this.editingUserId) return;

    this.confirmationService.confirm({
      message: '¿Está seguro de que desea restablecer los permisos a los predeterminados del rol?',
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const success = this.authService.resetUserPermissionsToRole(this.editingUserId!);
        if (success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Permisos restablecidos correctamente',
            life: 3000
          });
          this.loadUsers();
          this.closePermissionsDialog();
        }
      }
    });
  }

  getRoleLabel(role: string): string {
    const roleLabels: Record<string, string> = {
      'superAdmin': 'Super Admin',
      'groupAdmin': 'Admin de Grupo',
      'member': 'Miembro',
      'readonly': 'Solo Lectura'
    };
    return roleLabels[role] || role;
  }
}