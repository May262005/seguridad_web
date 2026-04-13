import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, Permission } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class SidebarComponent implements OnInit {
  user: any = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
  }

  currentUser(): any {
    return this.authService.getUser();
  }

  userAvatar(): string {
    return this.authService.getUserAvatar();
  }

  userFullName(): string {
    return this.authService.getUserFullName();
  }

  // ELIMINADO: isSuperAdmin() ya no existe
  // isSuperAdmin(): boolean {
  //   return this.authService.hasPermission('admin:full');
  // }

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission as Permission);
  }

  // Método para verificar si tiene algún permiso de administración
  hasAnyAdminPermission(): boolean {
    return this.hasPermission('group:view') || 
           this.hasPermission('user:view') || 
           this.hasPermission('user:manage-permissions') ||
           this.hasPermission('group:manage-permissions');
  }

  navegarA(ruta: string): void {
    console.log('Navegando a:', ruta);
    this.router.navigate([ruta]);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}