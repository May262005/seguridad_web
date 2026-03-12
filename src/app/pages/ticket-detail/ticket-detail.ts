// ─────────────────────────────────────────────
//  ticket-detail.ts
// ─────────────────────────────────────────────
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest } from 'rxjs';
import { ButtonModule }     from 'primeng/button';
import { InputTextModule }  from 'primeng/inputtext';
import { TextareaModule }   from 'primeng/textarea';
import { SelectModule }     from 'primeng/select';
import { DividerModule }    from 'primeng/divider';
import { ToastModule }      from 'primeng/toast';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService }   from 'primeng/api';
import { AuthService }      from '../auth/auth.service';
import { TicketService, FullTicket } from './ticket-service';
import { TicketStatus }     from '../dashboard/dashboard';

export interface TicketComment {
  id:        number;
  author:    string;
  avatar:    string;
  text:      string;
  createdAt: Date;
  isSystem:  boolean;
}

export interface Priority {
  value: string; label: string; color: string; bg: string;
}

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    ButtonModule, InputTextModule, TextareaModule,
    SelectModule, DividerModule, ToastModule, DatePickerModule,
  ],
  providers: [MessageService],
  templateUrl: './ticket-detail.html',
  styleUrl:    './ticket-detail.css',
})
export class TicketDetailComponent implements OnInit {

  auth           = inject(AuthService);
  private svc    = inject(TicketService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private msg    = inject(MessageService);

  // ── Ticket cargado ────────────────────────────
  ticket:     FullTicket | null = null;
  editTicket: FullTicket | null = null;
  notFound    = false;
  isEditing   = false;

  // ── Comentarios (por ticket) ──────────────────
  private commentsMap: Record<number, TicketComment[]> = {};
  get comments(): TicketComment[] {
    return this.ticket ? (this.commentsMap[this.ticket.id] ?? []) : [];
  }
  newComment = '';

  // ── 7 prioridades en español ──────────────────
  readonly priorities: Priority[] = [
    { value: 'Prioridad del sistema', label: 'Prioridad del sistema', color: '#8b0000', bg: '#ffe0e0' },
    { value: 'Dar prioridad', label: 'Dar prioridad',         color: '#c96b6b', bg: '#fde8e8' },
    { value: 'Importante', label: 'Importante',            color: '#C97B8A', bg: '#fde8f0' },
    { value: 'Principal', label: 'Principal',             color: '#b07db9', bg: '#f3e8fd' },
    { value: 'Derecho de prioridad', label: 'Derecho de prioridad',  color: '#7b9ec9', bg: '#e8f0fd' },
    { value: 'Orden de prioridad', label: 'Orden de prioridad',    color: '#6db98a', bg: '#e8fdf0' },
    { value: 'Asunto prioritario', label: 'Asunto prioritario',    color: '#9a8082', bg: '#F2EDE4' },
  ];

  // ── Opciones select ───────────────────────────
  statusOptions = [
    { label: 'Pendiente',   value: 'pendiente'   },
    { label: 'En progreso', value: 'en-progreso' },
    { label: 'Revisión',    value: 'revision'    },
    { label: 'Hecho',       value: 'hecho'       },
    { label: 'Bloqueado',   value: 'bloqueado'   },
  ];

  priorityOptions = this.priorities.map(p => ({ label: p.label, value: p.value }));

  memberOptions = [
    { label: 'Miembro del Equipo',     value: 'Miembro del Equipo'     },
    { label: 'Administrador de Grupo', value: 'Administrador de Grupo' },
  ];

  readonly statusConfig: Record<TicketStatus, { label: string; color: string; bg: string }> = {
    'pendiente':   { label: 'Pendiente',   color: '#9a8082', bg: '#F2EDE4' },
    'en-progreso': { label: 'En progreso', color: '#C97B8A', bg: '#fde8f0' },
    'revision':    { label: 'Revisión',    color: '#7b9ec9', bg: '#e8f0fd' },
    'hecho':       { label: 'Hecho',       color: '#6db98a', bg: '#e8fdf0' },
    'bloqueado':   { label: 'Bloqueado',   color: '#c96b6b', bg: '#fde8e8' },
  };

  // ── Contexto de navegación ────────────────────
  fromCtx:       string = 'list';
  fromGroupId:   number | null = null;
  fromGroupName: string = '';

  private readQueryParams(qp: Record<string, string>): void {
    if (!qp['from']) return;
    this.fromCtx       = qp['from'];
    this.fromGroupId   = qp['groupId']   ? +qp['groupId']   : null;
    this.fromGroupName = decodeURIComponent(qp['groupName'] ?? '');
  }

  // ── Init ──────────────────────────────────────
  ngOnInit(): void {
    // 1. Leer snapshot (síncrono, disponible inmediatamente)
    this.readQueryParams(this.route.snapshot.queryParams);

    // 2. Suscribirse por si cambia la ruta sin destruir el componente
    this.route.queryParams.subscribe(qp => this.readQueryParams(qp));

    // 3. Cargar ticket por :id
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      const found = this.svc.getById(id);
      if (!found) { this.notFound = true; return; }
      this.ticket   = { ...found };
      this.notFound = false;
      if (!this.commentsMap[id]) {
        this.commentsMap[id] = this.buildDefaultComments(found);
      }
    });
  }

  private buildDefaultComments(t: FullTicket): TicketComment[] {
    return [
      {
        id: 1, isSystem: true, author: 'Sistema', avatar: 'S',
        text: `Ticket creado por ${t.createdBy}.`,
        createdAt: new Date(t.createdAt),
      },
    ];
  }

  // ── Permisos ──────────────────────────────────
  get isAssigned(): boolean {
    return this.auth.currentUser()?.fullName === this.ticket?.assignedTo;
  }

  get canEditAll(): boolean {
    return this.auth.isSuperAdmin() || this.auth.isGroupAdmin();
  }

  get canComment(): boolean { return this.auth.isLoggedIn(); }

  get showQuickStatus(): boolean {
    return this.isAssigned && !this.canEditAll;
  }

  // ── Edición ───────────────────────────────────
  startEdit(): void {
    if (!this.ticket) return;
    this.editTicket = { ...this.ticket, dueDate: this.ticket.dueDate ? new Date(this.ticket.dueDate) : undefined };
    this.isEditing  = true;
  }

  cancelEdit(): void { this.isEditing = false; }

  saveEdit(): void {
    if (!this.ticket || !this.editTicket) return;
    const author   = this.auth.currentUser()?.fullName ?? 'Sistema';
    const changes: string[] = [];

    if (this.editTicket.title       !== this.ticket.title)
      changes.push(`Título cambiado a "${this.editTicket.title}"`);
    if (this.editTicket.status      !== this.ticket.status)
      changes.push(`Estado: ${this.getStatusCfg(this.ticket.status).label} → ${this.getStatusCfg(this.editTicket.status).label}`);
    if (this.editTicket.priority    !== this.ticket.priority)
      changes.push(`Prioridad: ${this.getPriority(this.ticket.priority).label} → ${this.getPriority(this.editTicket.priority).label}`);
    if (this.editTicket.assignedTo  !== this.ticket.assignedTo)
      changes.push(`Reasignado: ${this.ticket.assignedTo} → ${this.editTicket.assignedTo}`);
    if (this.editTicket.description !== this.ticket.description)
      changes.push('Descripción actualizada');

    // Guardar en el service (propagado a board y lista)
    this.svc.update(this.editTicket);
    this.ticket   = { ...this.editTicket };
    this.isEditing = false;

    changes.forEach(c => this.addSystemEntry(`${c} por ${author}.`));
    if (changes.length === 0)
      this.msg.add({ severity: 'info', summary: 'Sin cambios', life: 1800 });
    else
      this.msg.add({ severity: 'success', summary: 'Guardado', detail: `${changes.length} cambio(s) registrado(s).`, life: 2000 });
  }

  // ── Cambio rápido de estado ───────────────────
  quickStatus(status: TicketStatus): void {
    if (!this.ticket) return;
    const prev   = this.ticket.status;
    const author = this.auth.currentUser()?.fullName ?? 'Sistema';
    this.svc.updateStatus(this.ticket.id, status);
    this.ticket = { ...this.ticket, status };
    this.addSystemEntry(`Estado: ${this.getStatusCfg(prev).label} → ${this.getStatusCfg(status).label} por ${author}.`);
    this.msg.add({ severity: 'success', summary: 'Estado actualizado', life: 1800 });
  }

  // ── Comentar ──────────────────────────────────
  submitComment(): void {
    if (!this.newComment.trim() || !this.ticket) return;
    const user = this.auth.currentUser();
    if (!this.commentsMap[this.ticket.id]) this.commentsMap[this.ticket.id] = [];
    this.commentsMap[this.ticket.id].push({
      id:        this.comments.length + 1,
      author:    user?.fullName ?? 'Anónimo',
      avatar:    user?.avatar   ?? '?',
      text:      this.newComment.trim(),
      createdAt: new Date(),
      isSystem:  false,
    });
    this.newComment = '';
  }

  private addSystemEntry(text: string): void {
    if (!this.ticket) return;
    if (!this.commentsMap[this.ticket.id]) this.commentsMap[this.ticket.id] = [];
    this.commentsMap[this.ticket.id].push({
      id: this.comments.length + 1,
      author: 'Sistema', avatar: 'S',
      text, createdAt: new Date(), isSystem: true,
    });
  }

  // ── Back según contexto ───────────────────────
  goBack(): void {
    if (this.fromCtx === 'home') {
      this.router.navigate(['/app/home']);
    } else if (this.fromCtx === 'board') {
      this.router.navigate(['/app/board']);
    } else if (this.fromCtx === 'group' && this.fromGroupId) {
      this.router.navigate(['/app/tickets'], {
        queryParams: { groupId: this.fromGroupId, groupName: this.fromGroupName }
      });
    } else {
      this.router.navigate(['/app/tickets']);
    }
  }

  // Label del breadcrumb según contexto
  get backLabel(): string {
    if (this.fromCtx === 'home')  return 'Inicio';
    if (this.fromCtx === 'board') return 'Tablero';
    if (this.fromCtx === 'group') return this.fromGroupName || 'Grupos';
    return 'Tickets';
  }

  get backIcon(): string {
    if (this.fromCtx === 'home')  return 'pi-home';
    if (this.fromCtx === 'board') return 'pi-table';
    if (this.fromCtx === 'group') return 'pi-users';
    return 'pi-list';
  }

  // ── Helpers ───────────────────────────────────
  getPriority(value: string): Priority {
    return this.priorities.find(p => p.value === value) ?? this.priorities[2];
  }

  getStatusCfg(status: string) {
    return this.statusConfig[status as TicketStatus] ?? { label: status, color: '#9a8082', bg: '#F2EDE4' };
  }

  isOverdue(): boolean {
    return !!this.ticket?.dueDate
      && this.ticket.dueDate < new Date()
      && this.ticket.status !== 'hecho';
  }

  timeAgo(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60)    return 'hace un momento';
    if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}