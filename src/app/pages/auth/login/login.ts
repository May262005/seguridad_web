import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { RouterModule, Router } from '@angular/router';
import { MessageModule } from 'primeng/message';
import { CommonModule } from '@angular/common';

// Credenciales hardcodeadas
const VALID_USERS = [
  { email: 'admin@app.com', password: 'Admin@12345' },
  { email: 'usuario@app.com', password: 'Usuario@12345' }
];

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, CardModule, InputTextModule, PasswordModule, ButtonModule, ReactiveFormsModule, RouterModule, MessageModule],
  templateUrl: './login.html'
})
export class Login {
  loginForm: FormGroup;
  loginError = false;

  constructor(private fb: FormBuilder, private router: Router) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }

  login() {
    this.loginError = false;
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      const match = VALID_USERS.find(u => u.email === email && u.password === password);
      if (match) {
        this.router.navigate(['/welcome']);
      } else {
        this.loginError = true;
      }
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}