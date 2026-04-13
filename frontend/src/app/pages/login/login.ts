import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
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
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  loginError = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/app/dashboard']);
    }
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }

  login(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.loginError = false;

    const credentials = {
      email: this.email?.value,
      password: this.password?.value
    };

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.statusCode === 200 && response.data && response.data[0]) {
          const loginData = response.data[0];
          this.authService.saveSession(loginData);
          this.messageService.add({
            severity: 'success',
            summary: 'Exito',
            detail: 'Inicio de sesion exitoso'
          });
          this.router.navigate(['/app/dashboard']);
        } else {
          this.loginError = true;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.loginError = true;
        console.error('Error en login:', error);
      }
    });
  }
}