import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { AuthService, Permission } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-admin-groups',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    CheckboxModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './admin-groups.component.html',
  styleUrls: ['./admin-groups.component.css']
})
export class AdminGroupsComponent implements OnInit {
  groups: any[] = [];
  users: any[] = [];
  permisos: any[] = [];
  permisosLegibles: any[] = [];
  selectedGroup: any = null;
  selectedUser: any = null;
  selectedPermissions: string[] = [];
  currentGroupPermissions: string[] = [];
  selectedPermissionsMap: { [key: string]: boolean } = {};

  showGroupModal = false;
  showMemberModal = false;
  showPermissionModal = false;
  isLoading = false;
  isEditMode = false;

  groupForm: FormGroup;
  memberForm: FormGroup;

  private nombrePermisoMap: { [key: string]: string } = {
    'group:view': 'Ver grupos',
    'group:add': 'Crear grupos',
    'group:edit': 'Editar grupos',
    'group:delete': 'Eliminar grupos',
    'group:manage-permissions': 'Gestionar permisos de grupos',
    'group:users-add': 'Agregar miembros al grupo',
    'group:users-remove': 'Remover miembros del grupo',
    'ticket:view': 'Ver tickets',
    'ticket:create': 'Crear tickets',
    'ticket:edit': 'Editar tickets',
    'ticket:delete': 'Eliminar tickets',
    'ticket:assign': 'Asignar tickets',
    'ticket:comment': 'Comentar tickets',
    'ticket:move': 'Mover tickets',
    'ticket:status': 'Cambiar estado'
  };

  constructor(
    private authService: AuthService,
    private groupService: GroupService,
    private userService: UserService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {
    this.groupForm = this.fb.group({
      id: [''],
      nombre: ['', Validators.required],
      descripcion: ['']
    });

    this.memberForm = this.fb.group({
      usuario_id: ['', Validators.required],
      usuario_email: ['']
    });
  }

  ngOnInit(): void {
    this.cargarGrupos();
    this.cargarUsuarios();
    this.cargarPermisos();
  }

  hasGlobalPermission(permission: Permission): boolean {
    const globalPermissions = this.authService.getPermissions();
    return globalPermissions.includes(permission);
  }

  hasGroupPermission(permission: Permission, groupId: string): boolean {
    return this.authService.hasPermission(permission, groupId);
  }

  canViewGroup(group: any): boolean {
    if (this.hasGlobalPermission('group:view')) return true;
    return this.hasGroupPermission('group:view', group.id);
  }

  canEditGroup(group: any): boolean {
    if (this.hasGlobalPermission('group:edit')) return true;
    return this.hasGroupPermission('group:edit', group.id);
  }

  canDeleteGroup(group: any): boolean {
    if (this.hasGlobalPermission('group:delete')) return true;
    return this.hasGroupPermission('group:delete', group.id);
  }

  canManageGroupPermissions(group: any): boolean {
    if (this.hasGlobalPermission('group:manage-permissions')) return true;
    return this.hasGroupPermission('group:manage-permissions', group.id);
  }

  canAddMembersToGroup(group: any): boolean {
    if (this.hasGlobalPermission('group:users-add')) return true;
    return this.hasGroupPermission('group:users-add', group.id);
  }

  canRemoveMembersFromGroup(group: any): boolean {
    if (this.hasGlobalPermission('group:users-remove')) return true;
    return this.hasGroupPermission('group:users-remove', group.id);
  }

  canCreateGroup(): boolean {
    return this.hasGlobalPermission('group:add');
  }

  getNombreLegible(nombreTecnico: string): string {
    return this.nombrePermisoMap[nombreTecnico] || nombreTecnico;
  }

  cargarGrupos(): void {
    const hasGlobalView = this.hasGlobalPermission('group:view');

    console.log('Has global group:view:', hasGlobalView);

    if (hasGlobalView) {
      this.groupService.getGroups().subscribe({
        next: (res) => {
          console.log('Grupos globales cargados:', res);
          if (res?.statusCode === 200 && res?.data) {
            this.groups = res.data;
            this.groups.forEach(group => {
              this.cargarMiembros(group);
            });
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error cargando grupos globales:', err);
          this.cdr.detectChanges();
        }
      });
    } else {
      const userId = this.authService.getUserId();
      if (userId) {
        console.log('Cargando grupos para usuario especifico:', userId);
        this.groupService.getUserGroups(userId).subscribe({
          next: (res) => {
            console.log('Grupos del usuario cargados:', res);
            if (res?.statusCode === 200 && res?.data) {
              this.groups = res.data;
              this.groups.forEach(group => {
                this.cargarMiembros(group);
              });
            } else {
              this.groups = [];
            }
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error cargando grupos del usuario:', err);
            this.groups = [];
            this.cdr.detectChanges();
          }
        });
      }
    }
  }

  cargarMiembros(group: any): void {
    this.groupService.getMembers(group.id).subscribe({
      next: (res) => {
        group.miembros = (res?.statusCode === 200 && res?.data) ? res.data : [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando miembros:', err);
        group.miembros = [];
        this.cdr.detectChanges();
      }
    });
  }

  cargarUsuarios(): void {
    this.userService.getUsers().subscribe({
      next: (res) => {
        if (res?.statusCode === 200 && res?.data) {
          this.users = res.data;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error cargando usuarios:', err)
    });
  }

  cargarPermisos(): void {
    this.userService.getAllPermisos().subscribe({
      next: (res) => {
        if (res?.statusCode === 200 && res?.data) {
          const permisosFiltrados = res.data.filter((p: any) =>
            p.modulo === 'grupos' || p.modulo === 'tickets'
          );
          this.permisos = permisosFiltrados;
          this.permisosLegibles = permisosFiltrados.map((p: any) => ({
            id: p.id,
            nombre: p.nombre,
            nombreLegible: this.getNombreLegible(p.nombre),
            descripcion: p.descripcion,
            modulo: p.modulo
          }));
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error cargando permisos:', err)
    });
  }

  cargarPermisosUsuarioEnGrupo(groupId: string, userId: string): void {
    this.groupService.getUserPermissionsInGroup(groupId, userId).subscribe({
      next: (res) => {
        if (res?.statusCode === 200 && res?.data) {
          this.currentGroupPermissions = res.data.map((p: any) => p.id);
          this.selectedPermissions = [...this.currentGroupPermissions];
          this.selectedPermissionsMap = {};
          this.permisosLegibles.forEach(permiso => {
            this.selectedPermissionsMap[permiso.id] = this.selectedPermissions.includes(permiso.id);
          });
        } else {
          this.currentGroupPermissions = [];
          this.selectedPermissions = [];
          this.selectedPermissionsMap = {};
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando permisos:', err);
        this.currentGroupPermissions = [];
        this.selectedPermissions = [];
        this.selectedPermissionsMap = {};
        this.cdr.detectChanges();
      }
    });
  }

  openNewGroup(): void {
    if (!this.canCreateGroup()) {
      this.messageService.add({ severity: 'error', summary: 'Sin permiso', detail: 'No tienes permiso para crear grupos' });
      return;
    }
    this.isEditMode = false;
    this.groupForm.reset({ id: '', nombre: '', descripcion: '' });
    this.showGroupModal = true;
  }

  openEditGroup(group: any): void {
    if (!this.canEditGroup(group)) {
      this.messageService.add({ severity: 'error', summary: 'Sin permiso', detail: `No tienes permiso para editar el grupo "${group.nombre}"` });
      return;
    }
    this.isEditMode = true;
    this.groupForm.patchValue({
      id: group.id,
      nombre: group.nombre,
      descripcion: group.descripcion || ''
    });
    this.showGroupModal = true;
  }

  saveGroup(): void {
    if (this.groupForm.invalid) {
      this.groupForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formValue = this.groupForm.value;
    const userId = this.authService.getUserId();

    if (this.isEditMode) {
      const group = this.groups.find(g => g.id === formValue.id);
      if (!this.canEditGroup(group)) {
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Sin permiso', detail: 'No tienes permiso para editar este grupo' });
        return;
      }

      this.groupService.updateGroup(formValue.id, {
        nombre: formValue.nombre,
        descripcion: formValue.descripcion
      }).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.showGroupModal = false;
          if (res?.statusCode === 200) {
            this.messageService.add({ severity: 'success', summary: 'Exito', detail: 'Grupo actualizado correctamente' });
            this.cargarGrupos();
          } else {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al actualizar grupo' });
          }
        },
        error: () => {
          this.isLoading = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error de conexion' });
        }
      });
    } else {
      if (!this.canCreateGroup()) {
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Sin permiso', detail: 'No tienes permiso para crear grupos' });
        return;
      }

      this.groupService.createGroup({
        nombre: formValue.nombre,
        descripcion: formValue.descripcion,
        creador_id: userId
      }).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.showGroupModal = false;
          if (res?.statusCode === 201) {
            this.messageService.add({ severity: 'success', summary: 'Exito', detail: 'Grupo creado correctamente' });
            this.cargarGrupos();
          } else {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al crear grupo' });
          }
        },
        error: () => {
          this.isLoading = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error de conexion' });
        }
      });
    }
  }

  deleteGroup(group: any): void {
    if (!this.canDeleteGroup(group)) {
      this.messageService.add({ severity: 'error', summary: 'Sin permiso', detail: `No tienes permiso para eliminar el grupo "${group.nombre}"` });
      return;
    }

    this.confirmationService.confirm({
      message: `¿Estas seguro de eliminar el grupo "${group.nombre}"?`,
      header: 'Confirmar eliminacion',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Si',
      rejectLabel: 'No',
      accept: () => {
        this.groupService.deleteGroup(group.id).subscribe({
          next: (res) => {
            if (res?.statusCode === 200) {
              this.messageService.add({ severity: 'success', summary: 'Exito', detail: 'Grupo eliminado correctamente' });
              this.cargarGrupos();
            } else {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al eliminar grupo' });
            }
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error de conexion' });
          }
        });
      }
    });
  }

  openMemberModal(group: any): void {
    if (!this.canAddMembersToGroup(group)) {
      this.messageService.add({ severity: 'error', summary: 'Sin permiso', detail: `No tienes permiso para agregar miembros al grupo "${group.nombre}"` });
      return;
    }
    this.selectedGroup = group;
    this.memberForm.reset({ usuario_id: '', usuario_email: '' });
    this.showMemberModal = true;
  }

  addMemberByEmail(): void {
    const email = this.memberForm.get('usuario_email')?.value;
    if (!email) {
      this.messageService.add({ severity: 'warn', summary: 'Atencion', detail: 'Ingresa un correo electronico' });
      return;
    }

    const user = this.users.find(u => u.email === email);
    if (!user) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se encontro un usuario con ese correo' });
      return;
    }

    if (!this.canAddMembersToGroup(this.selectedGroup)) {
      this.messageService.add({ severity: 'error', summary: 'Sin permiso', detail: 'No tienes permiso para agregar miembros al grupo' });
      return;
    }

    this.isLoading = true;
    this.groupService.addMember(this.selectedGroup.id, user.id).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.showMemberModal = false;
        if (res?.statusCode === 201) {
          this.messageService.add({ severity: 'success', summary: 'Exito', detail: `${user.nombre_completo || user.email} agregado al grupo` });
          this.cargarGrupos();
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al agregar miembro' });
        }
      },
      error: () => {
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error de conexion' });
      }
    });
  }

  addMember(): void {
    if (this.memberForm.invalid) {
      this.memberForm.markAllAsTouched();
      return;
    }

    if (!this.canAddMembersToGroup(this.selectedGroup)) {
      this.messageService.add({ severity: 'error', summary: 'Sin permiso', detail: 'No tienes permiso para agregar miembros al grupo' });
      return;
    }

    this.isLoading = true;
    const usuarioId = this.memberForm.value.usuario_id;
    const usuario = this.users.find(u => u.id === usuarioId);

    this.groupService.addMember(this.selectedGroup.id, usuarioId).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.showMemberModal = false;
        if (res?.statusCode === 201) {
          this.messageService.add({ severity: 'success', summary: 'Exito', detail: `${usuario?.nombre_completo || usuario?.email} agregado al grupo` });
          this.cargarGrupos();
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al agregar miembro' });
        }
      },
      error: () => {
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error de conexion' });
      }
    });
  }

  openPermissionModal(group: any, user: any): void {
    if (!this.canManageGroupPermissions(group)) {
      this.messageService.add({ severity: 'error', summary: 'Sin permiso', detail: `No tienes permiso para gestionar permisos en el grupo "${group.nombre}"` });
      return;
    }
    this.selectedGroup = group;
    this.selectedUser = user;
    this.cargarPermisosUsuarioEnGrupo(group.id, user.id);
    this.showPermissionModal = true;
  }

  onPermissionChange(permisoId: string, checked: boolean): void {
    this.selectedPermissionsMap[permisoId] = checked;
    if (checked) {
      if (!this.selectedPermissions.includes(permisoId)) {
        this.selectedPermissions.push(permisoId);
      }
    } else {
      this.selectedPermissions = this.selectedPermissions.filter(id => id !== permisoId);
    }
  }

  isPermissionSelected(permisoId: string): boolean {
    return this.selectedPermissionsMap[permisoId] || false;
  }

  savePermissions(): void {
    this.isLoading = true;

    const toAdd = this.selectedPermissions.filter(id => !this.currentGroupPermissions.includes(id));
    const toRemove = this.currentGroupPermissions.filter(id => !this.selectedPermissions.includes(id));

    const requests: Promise<any>[] = [
      ...toAdd.map(permisoId =>
        this.groupService.assignPermissionToUserInGroup(this.selectedGroup.id, this.selectedUser.id, permisoId).toPromise()
      ),
      ...toRemove.map(permisoId =>
        this.groupService.removePermissionFromUserInGroup(this.selectedGroup.id, this.selectedUser.id, permisoId).toPromise()
      )
    ];

    Promise.all(requests).then(() => {
      this.isLoading = false;
      this.showPermissionModal = false;
      this.messageService.add({ severity: 'success', summary: 'Exito', detail: 'Permisos actualizados correctamente' });
      this.cargarPermisosUsuarioEnGrupo(this.selectedGroup.id, this.selectedUser.id);
    }).catch((err) => {
      this.isLoading = false;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al actualizar permisos' });
      console.error('Error guardando permisos:', err);
    });
  }

  removeMember(group: any, user: any): void {
    if (!this.canRemoveMembersFromGroup(group)) {
      this.messageService.add({ severity: 'error', summary: 'Sin permiso', detail: `No tienes permiso para remover miembros del grupo "${group.nombre}"` });
      return;
    }

    this.confirmationService.confirm({
      message: `¿Estas seguro de remover a "${user.nombre_completo}" del grupo? Los tickets que tenía asignados serán reasignados a sus creadores originales.`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Si',
      rejectLabel: 'No',
      accept: () => {
        this.isLoading = true;
        this.groupService.removeMember(group.id, user.id).subscribe({
          next: (res) => {
            this.isLoading = false;
            if (res?.statusCode === 200) {
              const ticketsReasignados = res.data?.[0]?.ticketsReasignados || 0;
              this.messageService.add({
                severity: 'success',
                summary: 'Exito',
                detail: `Miembro removido correctamente. ${ticketsReasignados} tickets reasignados a sus creadores.`
              });
              this.cargarGrupos();
            } else {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al remover miembro' });
            }
          },
          error: (err) => {
            this.isLoading = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.data?.[0]?.error || 'Error de conexion' });
          }
        });
      }
    });
  }

  getUsersNotInGroup(group: any): any[] {
    if (!group || !group.miembros) return this.users;
    const memberIds = group.miembros.map((m: any) => m.id);
    return this.users.filter(u => !memberIds.includes(u.id));
  }

  getInitials(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }
}