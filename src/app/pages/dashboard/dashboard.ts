import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ButtonModule }  from 'primeng/button';
import { TagModule }     from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { AuthService }   from '../auth/auth.service';
import { TicketService } from '../ticket-detail/ticket-service';

export type TicketStatus   = 'pendiente' | 'en-progreso' | 'revision' | 'hecho' | 'bloqueado';
export type TicketPriority =
  | 'Prioridad del sistema'
  | 'Dar prioridad'
  | 'Importante'
  | 'Principal'
  | 'Derecho de prioridad'
  | 'Orden de prioridad'
  | 'Asunto prioritario';

export interface Ticket {
  id: number; title: string; status: TicketStatus; priority: TicketPriority;
  assignedTo: string; createdAt: Date; dueDate?: Date; groupId: number;
}

export interface Group {
  id: number; nombre: string; descripcion: string;
  nivel: string; autor: string; integrantes: number; tickets: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, TagModule, DividerModule],
  templateUrl: './dashboard.html',
  styleUrl:    './dashboard.css',
})
export class DashboardComponent implements OnInit {
  auth           = inject(AuthService);
  private svc    = inject(TicketService);
  private router = inject(Router);
  groupModel = 'claude-sonnet-4-6';

  private readonly ALL_GROUPS: Group[] = [
    { id: 1, nombre: 'Grupo A', descripcion: 'Grupo de nivel básico.',     nivel: 'Básico',     autor: 'Ana López',    integrantes: 12, tickets: 4 },
    { id: 2, nombre: 'Grupo B', descripcion: 'Grupo de nivel intermedio.', nivel: 'Intermedio', autor: 'Carlos Ruiz',  integrantes: 8,  tickets: 2 },
    { id: 3, nombre: 'Grupo C', descripcion: 'Grupo de nivel avanzado.',   nivel: 'Avanzado',   autor: 'María Torres', integrantes: 5,  tickets: 2 },
  ];

  visibleGroups:  Group[]  = [];
  tickets:        Ticket[] = [];
  recentTickets:  Ticket[] = [];
  myTickets:      Ticket[] = [];
  totalTickets    = 0;
  completionRate  = 0;
  stats: { status: TicketStatus; label: string; icon: string; color: string; value: number }[] = [];

  readonly statusConfig: Record<TicketStatus, { label: string; color: string; bg: string }> = {
    'pendiente':   { label: 'Pendiente',   color: '#9a8082', bg: '#F2EDE4' },
    'en-progreso': { label: 'En progreso', color: '#C97B8A', bg: '#fde8f0' },
    'revision':    { label: 'Revisión',    color: '#7b9ec9', bg: '#e8f0fd' },
    'hecho':       { label: 'Hecho',       color: '#6db98a', bg: '#e8fdf0' },
    'bloqueado':   { label: 'Bloqueado',   color: '#c96b6b', bg: '#fde8e8' },
  };

  readonly priorityConfig: Record<TicketPriority, { label: string; color: string; bg: string }> = {
    'Prioridad del sistema': { label: 'Prioridad del sistema', color: '#8b0000', bg: '#ffe0e0' },
    'Dar prioridad':         { label: 'Dar prioridad',         color: '#c96b6b', bg: '#fde8e8' },
    'Importante':            { label: 'Importante',            color: '#C97B8A', bg: '#fde8f0' },
    'Principal':             { label: 'Principal',             color: '#b07db9', bg: '#f3e8fd' },
    'Derecho de prioridad':  { label: 'Derecho de prioridad',  color: '#7b9ec9', bg: '#e8f0fd' },
    'Orden de prioridad':    { label: 'Orden de prioridad',    color: '#6db98a', bg: '#e8fdf0' },
    'Asunto prioritario':    { label: 'Asunto prioritario',    color: '#9a8082', bg: '#F2EDE4' },
  };

  readonly nivelColor: Record<string, string> = {
    'Básico': '#6db98a', 'Intermedio': '#C97B8A', 'Avanzado': '#7b9ec9',
  };

  ngOnInit(): void {
    this.loadGroups();
    this.filterTicketsByRole();
    this.recentTickets = [...this.tickets]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5);
    const me = this.auth.userFullName();
    this.myTickets = this.tickets.filter(t => t.assignedTo === me).slice(0, 3);
  }

  private loadGroups(): void {
    const ids = this.auth.userGroupIds();
    this.visibleGroups = this.auth.isSuperAdmin()
      ? [...this.ALL_GROUPS]
      : this.ALL_GROUPS.filter(g => ids.includes(g.id));
  }

  private filterTicketsByRole(): void {
    const ids = this.auth.userGroupIds();
    if (this.auth.isSuperAdmin()) {
      this.tickets = this.svc.getAll();
    } else if (this.auth.isGroupAdmin()) {
      this.tickets = this.svc.getByGroupIds(ids);
    } else {
      this.tickets = this.svc.getByUser(this.auth.userFullName(), ids);
    }
    this.buildStats();
  }

  private buildStats(): void {
    this.totalTickets   = this.tickets.length;
    const done = this.tickets.filter(t => t.status === 'hecho').length;
    this.completionRate = this.totalTickets ? Math.round((done / this.totalTickets) * 100) : 0;
    this.stats = [
      { status: 'pendiente',   label: 'Pendiente',   icon: 'pi-clock',        color: '#9a8082', value: this.tickets.filter(t => t.status === 'pendiente').length   },
      { status: 'en-progreso', label: 'En Progreso', icon: 'pi-spinner',      color: '#C97B8A', value: this.tickets.filter(t => t.status === 'en-progreso').length },
      { status: 'revision',    label: 'Revisión',    icon: 'pi-eye',          color: '#7b9ec9', value: this.tickets.filter(t => t.status === 'revision').length    },
      { status: 'hecho',       label: 'Hecho',       icon: 'pi-check-circle', color: '#6db98a', value: this.tickets.filter(t => t.status === 'hecho').length       },
      { status: 'bloqueado',   label: 'Bloqueado',   icon: 'pi-ban',          color: '#c96b6b', value: this.tickets.filter(t => t.status === 'bloqueado').length   },
    ];
  }

  // Al picar un grupo → navega a /app/tickets?groupId=1&groupName=Grupo A
  openGroup(group: Group): void {
    this.router.navigate(['/app/tickets'], {
      queryParams: { groupId: group.id, groupName: group.nombre }
    });
  }

  get canCreateTicket(): boolean { return this.auth.isSuperAdmin() || this.auth.isGroupAdmin(); }
  isOverdue(t: Ticket): boolean  { return !!t.dueDate && t.dueDate < new Date() && t.status !== 'hecho'; }
  getStatusCfg(s: string)   { return this.statusConfig[s as TicketStatus]    ?? { label: s, color: '#9a8082', bg: '#F2EDE4' }; }
  getPriorityCfg(p: string) { return this.priorityConfig[p as TicketPriority] ?? { label: p, color: '#9a8082' }; }
}