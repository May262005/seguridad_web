import { Component } from '@angular/core';
import {
  ReactiveFormsModule, FormBuilder, FormGroup,
  Validators, AbstractControl, ValidationErrors
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';

function strongPassword(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value || '';
  const ok = v.length >= 10 && /[A-Z]/.test(v) && /[a-z]/.test(v)
    && /[0-9]/.test(v) && /[!@#$%^&*]/.test(v);
  return ok ? null : { strongPassword: true };
}

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pass = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pass === confirm ? null : { passwordsMismatch: true };
}

function adultAge(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return { required: true };
  const birth = new Date(control.value);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const isAdult = age > 18 || (age === 18 &&
    (today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())));
  return isAdult ? null : { underage: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    ButtonModule, InputTextModule, PasswordModule,
    CardModule, MessageModule, ToastModule, DatePickerModule
  ],
  providers: [MessageService],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  registerForm: FormGroup;
  today = new Date();

  constructor(private fb: FormBuilder, private router: Router, private msg: MessageService) {
    this.registerForm = this.fb.group({
      username:        ['', [Validators.required, Validators.minLength(3)]],
      fullName:        ['', [Validators.required]],
      email:           ['', [Validators.required, Validators.email]],
      birthDate:       ['', [Validators.required, adultAge]],
      phone:           ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      address:         ['', Validators.required],
      password:        ['', [Validators.required, strongPassword]],
      confirmPassword: ['', Validators.required],
    }, { validators: passwordsMatch });
  }

  get username()        { return this.registerForm.get('username'); }
  get fullName()        { return this.registerForm.get('fullName'); }
  get email()           { return this.registerForm.get('email'); }
  get birthDate()       { return this.registerForm.get('birthDate'); }
  get phone()           { return this.registerForm.get('phone'); }
  get address()         { return this.registerForm.get('address'); }
  get password()        { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }

  register() {
    if (this.registerForm.valid) {
      this.msg.add({ severity: 'success', summary: '¡Registro exitoso!', detail: `Bienvenido, ${this.registerForm.value.fullName}` });
      setTimeout(() => this.router.navigate(['/login']), 2000);
    } else {
      this.registerForm.markAllAsTouched();
      this.msg.add({ severity: 'warn', summary: 'Formulario incompleto', detail: 'Corrige los errores.' });
    }
  }
}