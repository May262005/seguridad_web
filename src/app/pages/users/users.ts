import { Component, OnInit } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { ButtonModule }  from 'primeng/button';
import { AvatarModule }  from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { TagModule }     from 'primeng/tag';

export interface User {
  username:  string;
  fullName:  string;
  email:     string;
  phone:     string;
  address:   string;
  birthDate: Date;
}

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, ButtonModule, AvatarModule, DividerModule, TagModule],
  templateUrl: './users.html',
  styleUrl:    './users.css'
})
export class UserComponent implements OnInit {

  user: User | null = null;

  ngOnInit(): void {
    // Sustituye esto por tu AuthService o el store que uses
    this.user = {
      username:  'admin',
      fullName:  'Administrador',
      email:     'admin@app.com',
      phone:     '5512345678',
      address:   'Calle Ejemplo 123',
      birthDate: new Date('1995-06-15'),
    };
  }

  editProfile(): void {
    // Navega a edición o abre un diálogo
    console.log('Editar perfil');
  }
}