import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { DatePickerModule } from 'primeng/datepicker';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
    ToastModule,
    DatePickerModule,
    InputGroupModule,
    InputGroupAddonModule
  ],
  providers: [MessageService],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  isLoading = false;
  today: Date = new Date();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      birthDate: ['', [Validators.required, this.ageValidator]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      address: ['', Validators.required],
      password: ['', [
        Validators.required,
        Validators.minLength(10),
        this.passwordValidator
      ]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordsMatchValidator });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/app/dashboard']);
    }
  }

  ageValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const birthDate = new Date(control.value);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 18 ? null : { underage: true };
  }

  passwordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*]/.test(value);
    
    const valid = hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
    return valid ? null : { passwordWeak: true };
  }

  passwordsMatchValidator(group: FormGroup): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordsMismatch: true };
  }

  get username() { return this.registerForm.get('username'); }
  get fullName() { return this.registerForm.get('fullName'); }
  get email() { return this.registerForm.get('email'); }
  get birthDate() { return this.registerForm.get('birthDate'); }
  get phone() { return this.registerForm.get('phone'); }
  get address() { return this.registerForm.get('address'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }

  register(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const userData = {
      nombre_completo: this.fullName?.value,
      email: this.email?.value,
      username: this.username?.value,
      password: this.password?.value,
      direccion: this.address?.value,
      telefono: this.phone?.value
    };

    this.authService.register(userData).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.statusCode === 201) {
          this.messageService.add({
            severity: 'success',
            summary: 'Registro exitoso',
            detail: 'Usuario creado correctamente. Ahora puedes iniciar sesion.'
          });
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: response.data?.[0]?.error || 'Error al registrar usuario'
          });
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.data?.[0]?.error || 'Error de conexion con el servidor'
        });
        console.error('Error en registro:', error);
      }
    });
  }
}