import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:3000';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.authService.getToken()}`
    };
  }

  // Agrega este método al UserService
  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, userData);
  }

  getUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/users`, { headers: this.getHeaders() });
  }

  getUserById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() });
  }

  updateUser(id: string, userData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}`, userData, { headers: this.getHeaders() });
  }

  changePassword(id: string, currentPassword: string, newPassword: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${id}/password`, { currentPassword, newPassword }, { headers: this.getHeaders() });
  }

  getUserPermissions(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}/permisos`, { headers: this.getHeaders() });
  }

  assignPermission(userId: string, permiso_id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${userId}/permisos`, { permiso_id }, { headers: this.getHeaders() });
  }

  removePermission(userId: string, permiso_id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${userId}/permisos/${permiso_id}`, { headers: this.getHeaders() });
  }

  getAllPermisos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/permisos`, { headers: this.getHeaders() });
  }

  getAllPermisosGlobal(): Observable<any> {
    return this.http.get(`${this.apiUrl}/permisos/all`, { headers: this.getHeaders() });
  }
}