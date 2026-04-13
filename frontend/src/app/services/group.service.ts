import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
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

  private getHeadersWithUserId() {
    return {
      'Authorization': `Bearer ${this.authService.getToken()}`,
      'x-user-id': this.authService.getUserId() ?? ''
    };
  }

  getGroups(): Observable<any> {
    return this.http.get(`${this.apiUrl}/groups`, { headers: this.getHeaders() });
  }

  getGroupById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/groups/${id}`, { headers: this.getHeaders() });
  }

  getUserGroups(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/groups/user/${userId}`, { headers: this.getHeaders() });
  }

  createGroup(groupData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/groups`, groupData, { headers: this.getHeaders() });
  }

  updateGroup(id: string, groupData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/groups/${id}`, groupData, { headers: this.getHeaders() });
  }

  deleteGroup(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/groups/${id}`, { headers: this.getHeaders() });
  }

  getMembers(groupId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/groups/${groupId}/members`, { headers: this.getHeaders() });
  }

  addMember(groupId: string, usuario_id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/groups/${groupId}/members`, { usuario_id }, { headers: this.getHeaders() });
  }

  removeMember(groupId: string, usuario_id: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/groups/${groupId}/members/${usuario_id}`,
      { headers: this.getHeadersWithUserId() }
    );
  }

  getUserPermissionsInGroup(groupId: string, userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/groups/${groupId}/users/${userId}/permisos`, { headers: this.getHeaders() });
  }

  assignPermissionToUserInGroup(groupId: string, userId: string, permiso_id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/groups/${groupId}/users/${userId}/permisos`, { permiso_id }, { headers: this.getHeaders() });
  }

  removePermissionFromUserInGroup(groupId: string, userId: string, permiso_id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/groups/${groupId}/users/${userId}/permisos/${permiso_id}`, { headers: this.getHeaders() });
  }
}