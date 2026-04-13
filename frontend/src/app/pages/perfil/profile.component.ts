import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService, Permission } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    PasswordModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user: any = null;
  isLoading = false;
  isSaving = false;

  // Modales
  showEditModal = false;
  showPasswordModal = false;

  // Formularios
  profileForm: FormGroup;
  passwordForm: FormGroup;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private fb: FormBuilder,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.profileForm = this.fb.group({
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
  }

  ngOnInit(): void {
    this.ngZone.run(() => {
      this.cargarPerfil();
    });
  }

  private refresh(): void {
    this.ngZone.run(() => {
      this.cdr.markForCheck();
    });
  }

  passwordsMatch(group: FormGroup): any {
    const password = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  cargarPerfil(): void {
    this.isLoading = true;
    const userId = this.authService.getUserId();

    if (!userId) {
      this.router.navigate(['/login']);
      return;
    }

    this.userService.getUserById(userId).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res?.statusCode === 200 && res?.data) {
          this.user = Array.isArray(res.data) ? res.data[0] : res.data;
          this.refresh();
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error cargando perfil:', err);
        this.refresh();
      }
    });
  }

  openEditModal(): void {
    if (!this.user) return;

    this.profileForm.patchValue({
      id: this.user.id,
      nombre_completo: this.user.nombre_completo,
      email: this.user.email,
      username: this.user.username,
      direccion: this.user.direccion || '',
      telefono: this.user.telefono || ''
    });
    this.showEditModal = true;
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formValue = this.profileForm.value;

    this.userService.updateUser(formValue.id, {
      nombre_completo: formValue.nombre_completo,
      email: formValue.email,
      username: formValue.username,
      direccion: formValue.direccion,
      telefono: formValue.telefono
    }).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.showEditModal = false;
        if (res?.statusCode === 200) {
          this.messageService.add({ severity: 'success', summary: 'Exito', detail: 'Perfil actualizado correctamente' });
          this.cargarPerfil();
          // Actualizar datos en localStorage
          const updatedUser = { ...this.user, ...formValue };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al actualizar perfil' });
        }
        this.refresh();
      },
      error: (err) => {
        this.isSaving = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.data?.[0]?.error || 'Error de conexion' });
        this.refresh();
      }
    });
  }

  openPasswordModal(): void {
    this.passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
    this.showPasswordModal = true;
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const userId = this.authService.getUserId();
    const formValue = this.passwordForm.value;

    this.userService.changePassword(userId!, formValue.currentPassword, formValue.newPassword).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.showPasswordModal = false;
        if (res?.statusCode === 200) {
          this.messageService.add({ severity: 'success', summary: 'Exito', detail: 'Contraseña actualizada correctamente' });
          this.passwordForm.reset();
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: res?.data?.[0]?.error || 'Error al cambiar contraseña' });
        }
        this.refresh();
      },
      error: (err) => {
        this.isSaving = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.data?.[0]?.error || 'Error de conexion' });
        this.refresh();
      }
    });
  }

  getInitials(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  volver(): void {
    this.router.navigate(['/app/dashboard']);
  }
}