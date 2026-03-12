import { Component, OnInit, inject } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { ButtonModule }  from 'primeng/button';
import { AvatarModule }  from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { TagModule }     from 'primeng/tag';
import { DialogModule }      from 'primeng/dialog';
import { InputTextModule }   from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { AuthService } from '../auth/auth.service';

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
  imports: [
    CommonModule, FormsModule,
    ButtonModule, AvatarModule, DividerModule, TagModule,
    DialogModule, InputTextModule, ConfirmDialogModule
  ],
  providers: [ConfirmationService],
  templateUrl: './users.html',
  styleUrl: './users.css'
})
export class UserComponent implements OnInit {

  private auth = inject(AuthService);

  user: User | null = null;

  showDialog = false;
  editUser: User = this.emptyUser();

  emptyUser(): User {
    return {
      username: '',
      fullName: '',
      email: '',
      phone: '',
      address: '',
      birthDate: new Date(),
    };
  }

  ngOnInit(): void {

    const current = this.auth.currentUser();

    if (current) {
      this.user = {
        username: current.username,
        fullName: current.fullName,
        email: current.email,
        phone: current.phone,
        address: current.address,
        birthDate: new Date(current.birthDate)
      };
    }

  }

  openEdit(): void {
    if (this.user) {
      this.editUser = { ...this.user };
      this.showDialog = true;
    }
  }

  save(): void {

    if (!this.editUser.fullName.trim()) return;

    this.user = { ...this.editUser };
    this.showDialog = false;

  }

  get birthDateString(): string {

    if (!this.editUser.birthDate) return '';

    const d = new Date(this.editUser.birthDate);

    return d.toISOString().substring(0, 10);

  }

  set birthDateString(val: string) {
    this.editUser.birthDate = new Date(val);
  }

}