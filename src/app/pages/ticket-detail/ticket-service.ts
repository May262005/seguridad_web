// ─────────────────────────────────────────────
//  ticket.service.ts  –  Estado compartido
// ─────────────────────────────────────────────
import { Injectable, signal } from '@angular/core';
import { Ticket, TicketStatus, TicketPriority } from '../dashboard/dashboard';

export type FullTicket = Ticket & { description: string; createdBy: string };

const INITIAL_TICKETS: FullTicket[] = [
  { id: 1, title: 'Diseñar pantalla de login',           description: 'Crear los wireframes y el diseño final de la pantalla de login siguiendo el design system.',                                                        status: 'hecho',       priority: 'Prioridad del sistema', assignedTo: 'Miembro del Equipo',     createdBy: 'Administrador de Grupo', createdAt: new Date('2025-01-10'), dueDate: new Date('2025-01-20'), groupId: 1 },
  { id: 2, title: 'Integrar API de autenticación',       description: 'Conectar el frontend con el backend de auth usando JWT. Incluir refresh token y manejo de sesión.',                                                 status: 'en-progreso', priority: 'Dar prioridad',         assignedTo: 'Usuario General',        createdBy: 'Administrador de Grupo', createdAt: new Date('2025-01-12'), dueDate: new Date('2025-01-25'), groupId: 1 },
  { id: 3, title: 'Crear componente de tabla',           description: 'Desarrollar un componente reutilizable de tabla con soporte para paginación, ordenamiento y filtros. Debe integrarse con PrimeNG.',                status: 'pendiente',   priority: 'Importante',            assignedTo: 'Miembro del Equipo',     createdBy: 'Administrador de Grupo', createdAt: new Date('2025-01-14'), dueDate: new Date('2025-01-30'), groupId: 1 },
  { id: 4, title: 'Testing unitario del servicio auth',  description: 'Escribir tests unitarios para el AuthService cubriendo login, logout, refresh token y manejo de errores.',                                          status: 'pendiente',   priority: 'Principal',             assignedTo: 'Administrador de Grupo', createdBy: 'Super Administrador',    createdAt: new Date('2025-01-19'), dueDate: new Date('2025-02-10'), groupId: 1 },
  { id: 5, title: 'Revisar diseño del kanban',           description: 'Revisar que el tablero kanban cumpla con las especificaciones de UX. Validar drag & drop, colores y responsive.',                                  status: 'revision',    priority: 'Derecho de prioridad',  assignedTo: 'Usuario Solo Lectura',   createdBy: 'Administrador de Grupo', createdAt: new Date('2025-01-15'), dueDate: new Date('2025-01-28'), groupId: 2 },
  { id: 6, title: 'Corregir bug en formulario',          description: 'El formulario de creación de tickets no valida correctamente el campo de fecha. Reproducible en Firefox y Safari.',                                 status: 'bloqueado',   priority: 'Prioridad del sistema', assignedTo: 'Administrador de Grupo', createdBy: 'Super Administrador',    createdAt: new Date('2025-01-16'), dueDate: new Date('2025-01-22'), groupId: 2 },
  { id: 7, title: 'Optimizar consultas a base de datos', description: 'Las queries de listado tardan más de 2s. Revisar índices y agregar caché con Redis para las consultas más frecuentes.',                             status: 'pendiente',   priority: 'Orden de prioridad',    assignedTo: 'Usuario General',        createdBy: 'Super Administrador',    createdAt: new Date('2025-01-17'), dueDate: new Date('2025-02-05'), groupId: 3 },
  { id: 8, title: 'Documentar endpoints REST',           description: 'Generar documentación Swagger/OpenAPI para todos los endpoints. Incluir ejemplos de request y response.',                                           status: 'en-progreso', priority: 'Asunto prioritario',    assignedTo: 'Usuario General',        createdBy: 'Administrador de Grupo', createdAt: new Date('2025-01-18'), dueDate: new Date('2025-02-01'), groupId: 3 },
];

@Injectable({ providedIn: 'root' })
export class TicketService {

  private _tickets = signal<FullTicket[]>(INITIAL_TICKETS.map(t => ({ ...t })));

  readonly tickets = this._tickets.asReadonly();

  // ── Lectura ───────────────────────────────────
  getById(id: number): FullTicket | undefined {
    return this._tickets().find(t => t.id === id);
  }

  getAll(): FullTicket[] {
    return this._tickets();
  }

  getByGroupIds(groupIds: number[]): FullTicket[] {
    return this._tickets().filter(t => groupIds.includes(t.groupId));
  }

  getByUser(fullName: string, groupIds: number[]): FullTicket[] {
    return this._tickets().filter(t =>
      groupIds.includes(t.groupId) && t.assignedTo === fullName
    );
  }

  // ── Escritura ─────────────────────────────────
  update(updated: FullTicket): void {
    this._tickets.update(list =>
      list.map(t => t.id === updated.id ? { ...updated } : t)
    );
  }

  updateStatus(id: number, status: TicketStatus): void {
    this._tickets.update(list =>
      list.map(t => t.id === id ? { ...t, status } : t)
    );
  }

  create(data: Omit<FullTicket, 'id' | 'createdAt'>): FullTicket {
    const newId = Math.max(...this._tickets().map(t => t.id)) + 1;
    const ticket: FullTicket = { ...data, id: newId, createdAt: new Date() };
    this._tickets.update(list => [...list, ticket]);
    return ticket;
  }

  delete(id: number): void {
    this._tickets.update(list => list.filter(t => t.id !== id));
  }

  getCountByGroupId(groupId: number): number {
    return this._tickets().filter(t => t.groupId === groupId).length;
  }
}