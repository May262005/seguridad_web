// ─────────────────────────────────────────────
//  ticket-list.ts  –  Lista + Kanban
// ─────────────────────────────────────────────
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ButtonModule }    from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule }    from 'primeng/select';
import { TagModule }       from 'primeng/tag';
import { ToastModule }     from 'primeng/toast';
import { DialogModule }    from 'primeng/dialog';
import { TextareaModule }  from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService }  from 'primeng/api';
import { AuthService }     from '../auth/auth.service';
import { HasPermissionDirective } from '../auth/has-permission.directive';
import { TicketService, FullTicket } from '../ticket-detail/ticket-service';
import { Ticket, TicketStatus, TicketPriority } from '../dashboard/dashboard';

type SortField = 'id' | 'title' | 'status' | 'priority' | 'assignedTo' | 'dueDate' | 'createdAt';
type SortDir   = 'asc' | 'desc';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    ButtonModule, InputTextModule, SelectModule,
    TagModule, ToastModule, DialogModule, TextareaModule,
    DatePickerModule,
    HasPermissionDirective,
  ],
  providers: [MessageService],
  templateUrl: './ticket-list.html',
  styleUrl:    './ticket-list.css',
})
export class TicketList implements OnInit {

  auth           = inject(AuthService);
  private svc    = inject(TicketService);
  private msg    = inject(MessageService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  activeGroupId:   number | null = null;
  activeGroupName: string        = '';
  viewMode: 'list' | 'kanban'   = 'list';

  private allTickets: FullTicket[] = [];
  filteredTickets:    FullTicket[] = [];

  // ── Drag & Drop (kanban) ──────────────────────
  draggedTicket: FullTicket | null  = null;
  dragOverCol:   TicketStatus | null = null;

  searchText      = '';
  filterStatus:   TicketStatus | ''   = '';
  filterPriority: TicketPriority | '' = '';
  filterAssigned  = '';
  sortField: SortField = 'id';
  sortDir:   SortDir   = 'asc';
  pageSize    = 5;
  currentPage = 1;

  readonly kanbanCols = [
    { status: 'pendiente'   as TicketStatus, label: 'Pendiente',   color: '#9a8082', bg: '#F2EDE4', icon: 'pi-clock'        },
    { status: 'en-progreso' as TicketStatus, label: 'En progreso', color: '#C97B8A', bg: '#fde8f0', icon: 'pi-spinner'      },
    { status: 'revision'    as TicketStatus, label: 'Revisión',    color: '#7b9ec9', bg: '#e8f0fd', icon: 'pi-eye'          },
    { status: 'hecho'       as TicketStatus, label: 'Hecho',       color: '#6db98a', bg: '#e8fdf0', icon: 'pi-check-circle' },
    { status: 'bloqueado'   as TicketStatus, label: 'Bloqueado',   color: '#c96b6b', bg: '#fde8e8', icon: 'pi-ban'          },
  ];

  statusOptions = [
    { label: 'Todos los estados',     value: ''            },
    { label: 'Pendiente',             value: 'pendiente'   },
    { label: 'En progreso',           value: 'en-progreso' },
    { label: 'Revisión',              value: 'revision'    },
    { label: 'Hecho',                 value: 'hecho'       },
    { label: 'Bloqueado',             value: 'bloqueado'   },
  ];

  priorityOptions = [
    { label: 'Todas las prioridades',  value: ''                       },
    { label: 'Prioridad del sistema',  value: 'Prioridad del sistema'  },
    { label: 'Dar prioridad',          value: 'Dar prioridad'          },
    { label: 'Importante',             value: 'Importante'             },
    { label: 'Principal',              value: 'Principal'              },
    { label: 'Derecho de prioridad',   value: 'Derecho de prioridad'   },
    { label: 'Orden de prioridad',     value: 'Orden de prioridad'     },
    { label: 'Asunto prioritario',     value: 'Asunto prioritario'     },
  ];

  memberOptions = [
    { label: 'Todos',                  value: ''                       },
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

  readonly priorityConfig: Record<TicketPriority, { label: string; color: string; bg: string }> = {
    'Prioridad del sistema': { label: 'Prioridad del sistema', color: '#8b0000', bg: '#ffe0e0' },
    'Dar prioridad':         { label: 'Dar prioridad',         color: '#c96b6b', bg: '#fde8e8' },
    'Importante':            { label: 'Importante',            color: '#C97B8A', bg: '#fde8f0' },
    'Principal':             { label: 'Principal',             color: '#b07db9', bg: '#f3e8fd' },
    'Derecho de prioridad':  { label: 'Derecho de prioridad',  color: '#7b9ec9', bg: '#e8f0fd' },
    'Orden de prioridad':    { label: 'Orden de prioridad',    color: '#6db98a', bg: '#e8fdf0' },
    'Asunto prioritario':    { label: 'Asunto prioritario',    color: '#9a8082', bg: '#F2EDE4' },
  };

  showDetail      = false;
  selectedTicket: FullTicket | null = null;

  // ── Modal: Crear ticket ───────────────────────
  showCreate = false;
  today      = new Date();
  newTicket: Partial<FullTicket> & { title: string; description: string } = this.blankTicket();

  private blankTicket() {
    return {
      title:       '',
      description: '',
      status:      'pendiente'   as TicketStatus,
      priority:    'Importante'  as TicketPriority,
      assignedTo:  '',
      createdBy:   '',
      groupId:     0,
      createdAt:   new Date(),
      dueDate:     undefined as Date | undefined,
    };
  }

  openCreate(): void {
    this.newTicket = {
      ...this.blankTicket(),
      groupId:   this.activeGroupId ?? 0,
      createdBy: this.auth.userFullName(),
      createdAt: new Date(),
    };
    this.showCreate = true;
  }

  saveCreate(): void {
    if (!this.newTicket.title?.trim()) {
      this.msg.add({ severity: 'warn', summary: 'Campo requerido', detail: 'El título es obligatorio.', life: 2500 });
      return;
    }
    this.svc.create({
      title:       this.newTicket.title,
      description: this.newTicket.description,
      status:      this.newTicket.status      as TicketStatus,
      priority:    this.newTicket.priority    as TicketPriority,
      assignedTo:  this.newTicket.assignedTo  ?? '',
      createdBy:   this.newTicket.createdBy   ?? this.auth.userFullName(),
      groupId:     this.newTicket.groupId     ?? this.activeGroupId ?? 0,
      dueDate:     this.newTicket.dueDate,
    });
    this.showCreate = false;
    this.loadFromService();
    this.applyFilters();
    this.msg.add({ severity: 'success', summary: 'Ticket creado', detail: `"${this.newTicket.title}" añadido correctamente.`, life: 2500 });
  }

  detailStatusOptions   = this.statusOptions.slice(1);
  detailPriorityOptions = [
    { label: 'Prioridad del sistema', value: 'Prioridad del sistema' },
    { label: 'Dar prioridad',         value: 'Dar prioridad'         },
    { label: 'Importante',            value: 'Importante'            },
    { label: 'Principal',             value: 'Principal'             },
    { label: 'Derecho de prioridad',  value: 'Derecho de prioridad'  },
    { label: 'Orden de prioridad',    value: 'Orden de prioridad'    },
    { label: 'Asunto prioritario',    value: 'Asunto prioritario'    },
  ];
  detailMemberOptions = [
    { label: 'Miembro del Equipo',     value: 'Miembro del Equipo'     },
    { label: 'Usuario General',        value: 'Usuario General'        },
    { label: 'Administrador de Grupo', value: 'Administrador de Grupo' },
  ];

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.activeGroupId   = params['groupId']   ? +params['groupId'] : null;
      this.activeGroupName = params['groupName'] ?? '';
      this.loadFromService();
      this.applyFilters();
    });
  }

  private loadFromService(): void {
    const groupIds = this.auth.userGroupIds();
    let base: FullTicket[];

    if (this.auth.isSuperAdmin()) {
      base = this.svc.getAll();
    } else if (this.auth.isGroupAdmin()) {
      base = this.svc.getByGroupIds(groupIds);
    } else {
      base = this.svc.getByUser(this.auth.userFullName(), groupIds);
    }

    this.allTickets = this.activeGroupId
      ? base.filter(t => t.groupId === this.activeGroupId)
      : base;
  }

  // ── queryParams para ticket-detail (contexto de navegación) ──
  get ticketFromParams(): Record<string, string | number> {
    if (this.activeGroupId) {
      return {
        from:      'group',
        groupId:   this.activeGroupId,
        groupName: this.activeGroupName   // Angular RouterLink lo encodea automáticamente
      };
    }
    return { from: 'list' };
  }

  clearGroupFilter(): void {
    this.router.navigate([], { queryParams: {} });
  }

  applyFilters(): void {
    let result = [...this.allTickets];
    if (this.searchText.trim()) {
      const q = this.searchText.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.assignedTo.toLowerCase().includes(q) ||
        String(t.id).includes(q)
      );
    }
    if (this.filterStatus)   result = result.filter(t => t.status   === this.filterStatus);
    if (this.filterPriority) result = result.filter(t => t.priority === this.filterPriority);
    if (this.filterAssigned) result = result.filter(t => t.assignedTo === this.filterAssigned);
    this.filteredTickets = this.sortTickets(result);
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.searchText = ''; this.filterStatus = '';
    this.filterPriority = ''; this.filterAssigned = '';
    this.applyFilters();
  }

  sortBy(field: SortField): void {
    this.sortDir   = this.sortField === field ? (this.sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    this.sortField = field;
    this.applyFilters();
  }

  private sortTickets(tickets: FullTicket[]): FullTicket[] {
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return [...tickets].sort((a, b) => {
      const av = a[this.sortField as keyof Ticket];
      const bv = b[this.sortField as keyof Ticket];
      if (av == null) return 1; if (bv == null) return -1;
      if (av instanceof Date && bv instanceof Date) return (av.getTime() - bv.getTime()) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  sortIcon(field: SortField): string {
    if (this.sortField !== field) return 'pi-sort';
    return this.sortDir === 'asc' ? 'pi-sort-amount-up' : 'pi-sort-amount-down';
  }

  // ── Kanban ────────────────────────────────────
  ticketsByStatus(s: TicketStatus): FullTicket[] { return this.filteredTickets.filter(t => t.status === s); }

  onDragStart(ticket: FullTicket): void  { this.draggedTicket = ticket; }
  onDragLeave(): void                    { this.dragOverCol = null; }

  onDragOver(event: DragEvent, status: TicketStatus): void {
    event.preventDefault();
    this.dragOverCol = status;
  }

  onDrop(status: TicketStatus): void {
    if (!this.draggedTicket || this.draggedTicket.status === status) {
      this.draggedTicket = null; this.dragOverCol = null; return;
    }
    this.svc.updateStatus(this.draggedTicket.id, status);
    this.msg.add({
      severity: 'success', summary: 'Estado actualizado',
      detail: `"${this.draggedTicket.title}" → ${this.getStatusCfg(status).label}`, life: 2500,
    });
    this.draggedTicket = null; this.dragOverCol = null;
    this.loadFromService();
    this.applyFilters();
  }

  // ── Paginación ────────────────────────────────
  get totalPages(): number { return Math.ceil(this.filteredTickets.length / this.pageSize) || 1; }
  get pagedTickets(): FullTicket[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredTickets.slice(start, start + this.pageSize);
  }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  prevPage(): void { if (this.currentPage > 1) this.currentPage--; }
  nextPage(): void { if (this.currentPage < this.totalPages) this.currentPage++; }

  // ── Dialog edición rápida ─────────────────────
  openDetail(ticket: FullTicket): void {
    this.selectedTicket = { ...ticket }; this.showDetail = true;
  }

  saveDetail(): void {
    if (!this.selectedTicket) return;
    this.svc.update(this.selectedTicket);
    this.showDetail = false;
    this.loadFromService();
    this.applyFilters();
    this.msg.add({ severity: 'success', summary: 'Guardado', detail: 'Ticket actualizado.', life: 2000 });
  }

  deleteTicket(ticket: FullTicket): void {
    this.svc.delete(ticket.id);
    this.loadFromService();
    this.applyFilters();
    this.msg.add({ severity: 'warn', summary: 'Eliminado', detail: `Ticket #${ticket.id} eliminado.`, life: 2000 });
  }

  // ── Helpers ───────────────────────────────────
  isOverdue(t: FullTicket): boolean { return !!t.dueDate && t.dueDate < new Date() && t.status !== 'hecho'; }
  // Botón crear: solo admins Y solo cuando están dentro de un grupo
  get canCreateTicket(): boolean {
    return (this.auth.isSuperAdmin() || this.auth.isGroupAdmin()) && !!this.activeGroupId;
  }
  get activeFilterCount(): number {
    return [this.searchText, this.filterStatus, this.filterPriority, this.filterAssigned].filter(v => !!v).length;
  }
  getStatusCfg(s: string)   { return this.statusConfig[s as TicketStatus]    ?? { label: s, color: '#9a8082', bg: '#F2EDE4' }; }
  getPriorityCfg(p: string) { return this.priorityConfig[p as TicketPriority] ?? { label: p, color: '#9a8082' }; }
  minVal(a: number, b: number): number { return Math.min(a, b); }
}