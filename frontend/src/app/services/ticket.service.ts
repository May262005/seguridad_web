import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
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

  getTickets(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      if (filters.grupo_id) params = params.set('grupo_id', filters.grupo_id);
      if (filters.estado_id) params = params.set('estado_id', filters.estado_id);
      if (filters.prioridad_id) params = params.set('prioridad_id', filters.prioridad_id);
      if (filters.asignado_id) params = params.set('asignado_id', filters.asignado_id);
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }
    return this.http.get(`${this.apiUrl}/tickets`, { headers: this.getHeaders(), params });
  }

  getTicketById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/tickets/${id}`, { headers: this.getHeaders() });
  }

  createTicket(ticketData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/tickets`, ticketData, { headers: this.getHeaders() });
  }

  updateTicket(id: string, ticketData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/tickets/${id}`, ticketData, { headers: this.getHeaders() });
  }

  changeStatus(id: string, estado_id: string, usuario_id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/tickets/${id}/status`, { estado_id, usuario_id }, { headers: this.getHeaders() });
  }

  closeTicket(id: string, usuario_id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/tickets/${id}/close`, { usuario_id }, { headers: this.getHeaders() });
  }

  getComentarios(ticketId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/tickets/${ticketId}/comentarios`, { headers: this.getHeaders() });
  }

  addComentario(ticketId: string, autor_id: string, contenido: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/tickets/${ticketId}/comentarios`, { autor_id, contenido }, { headers: this.getHeaders() });
  }

  getHistorial(ticketId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/tickets/${ticketId}/historial`, { headers: this.getHeaders() });
  }

  getEstadisticas(grupoId?: string): Observable<any> {
    let params = new HttpParams();
    if (grupoId) params = params.set('grupo_id', grupoId);
    return this.http.get(`${this.apiUrl}/estadisticas`, { headers: this.getHeaders(), params });
  }

  getEstados(): Observable<any> {
    return this.http.get(`${this.apiUrl}/estados`, { headers: this.getHeaders() });
  }

  getPrioridades(): Observable<any> {
    return this.http.get(`${this.apiUrl}/prioridades`, { headers: this.getHeaders() });
  }

  deleteTicket(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tickets/${id}`, { headers: this.getHeaders() });
  }
}