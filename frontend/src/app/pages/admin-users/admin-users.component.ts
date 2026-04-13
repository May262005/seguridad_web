import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { AuthService, Permission } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { GroupService } from '../../services/group.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    CheckboxModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent implements OnInit {
  users: any[] = [];
  grupos: any[] = [];
  permisos: any[] = [];
  permisosLegibles: any[] = [];
  selectedUser: any = null;
  selectedGroupId: string = '';
  userPermissions: any[] = [];
  userPermissionsIds: string[] = [];
  selectedPermissions: string[] = [];

  showUserModal = false;
  showPasswordModal = false;
  showPermissionModal = false;
  isLoading = false;
  isEditMode = false;

  selectedPermisoGlobal: string = '';
  selectedGrupoPermiso: string = '';
  selectedPermisoGrupo: string = '';

  userForm: FormGroup;
  passwordForm: FormGroup;
  newUserForm: FormGroup;

  // Mapa de permisos SIN admin:full
  private nombrePermisoMap: { [key: string]: string } = {
    'group:view': 'Ver grupos',
    'group:add': 'Crear grupos',
    'group:edit': 'Editar grupos',
    'group:users-add': 'Agregar miembros a grupos',
    'group:users-remove': 'Eliminar miembros de grupos',
    'group:delete': 'Eliminar grupos',
    'group:manage-permissions': 'Gestionar permisos en grupos',
    'ticket:view': 'Ver tickets',
    'ticket:create': 'Crear tickets',
    'ticket:edit': 'Editar tickets',
    'ticket:delete': 'Eliminar tickets',
    'ticket:assign': 'Asignar tickets',
    'ticket:comment': 'Comentar tickets',
    'ticket:move': 'Mover tickets',
    'ticket:status': 'Cambiar estado',
    'user:view': 'Ver usuarios',
    'user:create': 'Crear usuarios',
    'user:edit': 'Editar usuarios',
    'user:delete': 'Eliminar usuarios',
    'user:manage-permissions': 'Gestionar permisos de usuarios',
    'dashboard:stats': 'Ver estadísticas'
  };

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private groupService: GroupService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {
    this.userForm = this.fb.group({
      id: [''],
      nombre_completo: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required],
      direccion: [''],
      telefono: ['']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordsMatch });

    this.newUserForm = this.fb.group({
      nombre_completo: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      direccion: [''],
      telefono: ['']
    });
  }

  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarGrupos();
    this.cargarPermisos();
  }

  hasPermission(permission: Permission): boolean {
    return this.authService.hasPermission(permission);
  }

  // CORREGIDO: solo usa user:manage-permissions, sin admin:full
  canManageUserPermissions(): boolean {
    return this.hasPermission('user:manage-permissions');
  }

  getNombreLegible(nombreTecnico: string): string {
    return this.nombrePermisoMap[nombreTecnico] || nombreTecnico;
  }

  passwordsMatch(group: FormGroup): any {
    const password = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  cargarUsuarios(): void {
    // Solo usuarios con permiso user:view pueden ver la lista
    if (!this.hasPermission('user:view')) {
      console.warn('No tiene permiso para ver usuarios');
      return;
    }

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

  cargarGrupos(): void {
    this.groupService.getGroups().subscribe({
      next: (res) => {
        if (res?.statusCode === 200 && res?.data) {
          this.grupos = res.data;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error cargando grupos:', err)
    });
  }

  // CORREGIDO: usa getAllPermisos() que filtra solo grupos y tickets
  // Para permisos de usuarios se necesita otro endpoint o filtrar
  cargarPermisos(): void {
    this.userService.getAllPermisos().subscribe({
      next: (res) => {
        if (res?.statusCode === 200 && res?.data) {
          // Para gestión de usuarios, mostramos TODOS los permisos excepto admin:full si no queremos
          const permisosFiltrados = res.data.filter((p: any) => 
            p.modulo === 'usuarios' || p.modulo === 'grupos' || p.modulo === 'tickets'
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

  cargarPermisosUsuario(userId: string): void {
    this.userService.getUserPermissions(userId).subscribe({
      next: (res) => {
        if (res?.statusCode === 200 && res?.data) {
          this.userPermissions = res.data;
          this.userPermissionsIds = res.data.map((p: any) => p.id);
          this.selectedPermissions = [...this.userPermissionsIds];
        } else {
          this.userPermissions = [];
          this.userPermissionsIds = [];
          this.selectedPermissions = [];
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando permisos del usuario:', err);
        this.userPermissions = [];
        this.userPermissionsIds = [];
        this.selectedPermissions = [];
        this.cdr.detectChanges();
      }
    });
  }

  openNewUser(): void {
    if (!this.hasPermission('user:create')) {
      this.messageService.add({ severity: 'error', summary: 'Sin permiso', detail: 'No tienes permiso para crear usuarios' });
      return;
    }
    this.isEditMode = false;
    this.newUserForm.reset({ nombre_completo: '', email: '', username: '', password: '', direccion: '', telefono: '' });
    this.showUserModal = true;
  }

  openEditUser(user: any): void {
    if (!this.hasPermission('user:edit')) {
      this.messageService.add({ severity: 'error', summary: 'Sin permiso', detail: 'No tienes permiso para editar usuarios' });
      return;
    }
    this.isEditMode = true;
    this.userForm.patchValue({
      id: user.id,
      nombre_completo: user.nombre_completo,
      email: user.email,
      username: user.username,
      direccion: user.direccion || '',
      telefono: user.telefono || ''
    });
    this.showUserModal = true;
  }

  saveUser(): void {
    if (this.isEditMode) {
      if (this.userForm.invalid) {
        this.userForm.markAllAsTouched();
        return;
      }
      this.isLoading = true;
      const formValue = this.userForm.value;
      this.userService.updateUser(formValue.id, {
        nombre_completo: formValue.nombre_completo,
        email: formValue.email,
        username: formValue.username,
        direccion: formValue.direccion,
        telefono: formValue.telefono
      }).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.showUserModal = false;
          if (res?.statusCode === 200) {
            this.messageService.add({ severity: 'success', summary: 'Exito', detail: 'Usuario actualizado correctamente' });
            this.cargarUsuarios();
          } else {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al actualizar usuario' });
          }
        },
        error: () => {
          this.isLoading = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error de conexion' });
        }
      });
    } else {
      if (this.newUserForm.invalid) {
        this.newUserForm.markAllAsTouched();
        return;
      }
      this.isLoading = true;
      const formValue = this.newUserForm.value;
      this.userService.register({
        nombre_completo: formValue.nombre_completo,
        email: formValue.email,
        username: formValue.username,
        password: formValue.password,
        direccion: formValue.direccion,
        telefono: formValue.telefono
      }).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.showUserModal = false;
          if (res?.statusCode === 201) {
            this.messageService.add({ severity: 'success', summary: 'Exito', detail: 'Usuario creado correctamente' });
            this.cargarUsuarios();
          } else {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: res?.data?.[0]?.error || 'Error al crear usuario' });
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.data?.[0]?.error || 'Error de conexion' });
        }
      });
    }
  }

  openPasswordModal(user: any): void {
    this.selectedUser = user;
    this.passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
    this.showPasswordModal = true;
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    const formValue = this.passwordForm.value;
    this.userService.changePassword(this.selectedUser.id, formValue.currentPassword, formValue.newPassword).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.showPasswordModal = false;
        if (res?.statusCode === 200) {
          this.messageService.add({ severity: 'success', summary: 'Exito', detail: 'Contraseña actualizada correctamente' });
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al cambiar contraseña' });
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.data?.[0]?.error || 'Error de conexion' });
      }
    });
  }

  openPermissionModal(user: any): void {
    if (!this.canManageUserPermissions()) {
      this.messageService.add({ severity: 'error', summary: 'Sin permiso', detail: 'No tienes permiso para gestionar permisos de usuarios' });
      return;
    }
    this.selectedUser = user;
    this.cargarPermisosUsuario(user.id);
    this.showPermissionModal = true;
  }

  onPermissionChange(permisoId: string, checked: boolean): void {
    if (checked) {
      if (!this.selectedPermissions.includes(permisoId)) {
        this.selectedPermissions.push(permisoId);
      }
    } else {
      this.selectedPermissions = this.selectedPermissions.filter(id => id !== permisoId);
    }
  }

  isPermissionSelected(permisoId: string): boolean {
    return this.selectedPermissions.includes(permisoId);
  }

  savePermissions(): void {
    this.isLoading = true;

    const toAdd = this.selectedPermissions.filter(id => !this.userPermissionsIds.includes(id));
    const toRemove = this.userPermissionsIds.filter(id => !this.selectedPermissions.includes(id));

    const requests: Promise<any>[] = [
      ...toAdd.map(permisoId =>
        this.userService.assignPermission(this.selectedUser.id, permisoId).toPromise()
      ),
      ...toRemove.map(permisoId =>
        this.userService.removePermission(this.selectedUser.id, permisoId).toPromise()
      )
    ];

    Promise.all(requests).then(() => {
      this.isLoading = false;
      this.showPermissionModal = false;
      this.messageService.add({ severity: 'success', summary: 'Exito', detail: 'Permisos actualizados correctamente' });
      this.cargarPermisosUsuario(this.selectedUser.id);
    }).catch((err) => {
      this.isLoading = false;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al actualizar permisos' });
      console.error('Error guardando permisos:', err);
    });
  }

  getInitials(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }
}