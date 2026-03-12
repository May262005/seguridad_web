// ─────────────────────────────────────────────
//  sidebar.ts
// ─────────────────────────────────────────────
import { Component, inject } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { RouterModule, RouterLinkActive } from '@angular/router';
import { AuthService }   from '../../pages/auth/auth.service';

@Component({
  selector:    'app-sidebar',
  standalone:  true,
  imports:     [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl:    './sidebar.css',
})
export class Sidebar {
  auth = inject(AuthService);

  logout(): void {
    this.auth.logout();
  }
}