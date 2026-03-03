import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule }    from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule }  from 'primeng/password';
import { CardModule }      from 'primeng/card';
import { RouterModule, Router } from '@angular/router';
import { MessageModule }   from 'primeng/message';
import { CommonModule }    from '@angular/common';
import { AvatarModule }    from 'primeng/avatar';
import { DividerModule }   from 'primeng/divider';
import { PanelModule }     from 'primeng/panel';
import { TagModule }       from 'primeng/tag';
import { ChipModule }      from 'primeng/chip';

// Credenciales hardcodeadas
const VALID_USERS = [
  { email: 'admin@app.com',   password: 'Admin@12345'   },
  { email: 'usuario@app.com', password: 'Usuario@12345' }
];

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
    AvatarModule,
    DividerModule,
    PanelModule,
    TagModule,
    ChipModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  loginForm: FormGroup;
  loginError = false;
  isLoading  = false;

  constructor(private fb: FormBuilder, private router: Router) {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  get email()    { return this.loginForm.get('email');    }
  get password() { return this.loginForm.get('password'); }

  login() {
    this.loginError = false;
    if (this.loginForm.valid) {
      this.isLoading = true;
      const { email, password } = this.loginForm.value;
      const match = VALID_USERS.find(u => u.email === email && u.password === password);

      setTimeout(() => {
        this.isLoading = false;
        if (match) {
          this.router.navigate(['/app/home']);
        } else {
          this.loginError = true;
        }
      }, 600); // pequeño delay para que se vea el spinner
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}