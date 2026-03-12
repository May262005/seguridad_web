import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CommonModule }    from '@angular/common';
import { ButtonModule }    from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule }  from 'primeng/password';
import { CardModule }      from 'primeng/card';
import { MessageModule }   from 'primeng/message';
import { AuthService }     from '../auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    CardModule, InputTextModule, PasswordModule,
    ButtonModule, MessageModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private auth   = inject(AuthService);

  constructor() {
    // 🔐 Si ya hay sesión restaurada, ir al home
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/app/home']);
    }
  }

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  loginError = false;
  isLoading  = false;

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }

  async login() {

    this.loginError = false;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const { email, password } = this.loginForm.value;

    const ok = await this.auth.login(email!, password!);

    this.isLoading = false;

    if (ok) {
      this.router.navigate(['/app/home']);
    } else {
      this.loginError = true;
    }

  }
}