import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AuthService, Permission } from '../../services/auth.service';
import { TicketService } from '../../services/ticket.service';
import { GroupService } from '../../services/group.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule, FormsModule,
    CardModule, ButtonModule, DialogModule, SelectModule,
    InputTextModule, TextareaModule, ToastModule
  ],
  providers: [MessageService],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {

  totalTickets   = 0;
  completionRate = 0;

  stats: any[] = [
    { label: 'Pendientes',  value: 0, icon: 'pi-clock',           color: '#f59e0b', status: 'To-Do'      },
    { label: 'En Progreso', value: 0, icon: 'pi-spin pi-spinner', color: '#3b82f6', status: 'In Progress' },
    { label: 'Completados', value: 0, icon: 'pi-check-circle',    color: '#10b981', status: 'Done'        },
    { label: 'Bloqueados',  value: 0, icon: 'pi-ban',             color: '#c0626e', status: 'Blocked'     },
    { label: 'En Revisión', value: 0, icon: 'pi-eye',             color: '#dab0b2', status: 'Review'      }
  ];

  recentTickets:   any[] = [];
  myTickets:       any[] = [];
  misGrupos:       any[] = [];
  gruposList:      any[] = [];
  selectedGrupoId: string = '';
  grupoTickets:    any[] = [];
  prioridadesList: any[] = [];
  asignadosList:   any[] = [];
  estadosList:     any[] = [];
  showTicketModal  = false;
  isLoading        = false;
  ticketForm: FormGroup;

  nivelColor: { [key: string]: string } = {
    'Urgente': '#F54927', 'Alta': '#c0626e', 'Media': '#C97B8A', 'Baja': '#dab0b2'
  };

  constructor(
    private authService: AuthService,
    private ticketService: TicketService,
    private groupService: GroupService,
    private router: Router,
    private fb: FormBuilder,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.ticketForm = this.fb.group({
      grupo_id:     ['', Validators.required],
      titulo:       ['', [Validators.required, Validators.minLength(5)]],
      descripcion:  ['', [Validators.required, Validators.minLength(10)]],
      prioridad_id: [''],
      asignado_id:  ['']
    });
  }

  ngOnInit(): void {
    this.authService.refreshPermisos().then(() => {
      this.ngZone.run(() => {
        console.log('Permisos globales:', this.authService.getPermissions());
        console.log('Permisos por grupo:', this.authService.getPermisosPorGrupo());
        console.log('Usuario:', this.authService.currentUser());

        this.cargarEstadisticas();
        this.cargarTicketsRecientes();
        this.cargarMisTickets();
        this.cargarMisGrupos();
        this.cargarPrioridades();
        this.cargarEstados();
      });
    });
  }

  // ── Permisos ────────────────────────────────────────────

  hasGlobalPermission(permission: Permission): boolean {
    return this.authService.getPermissions().includes(permission);
  }

  isAdmin(): boolean {
    return this.hasGlobalPermission('user:manage-permissions') ||
           this.hasGlobalPermission('user:view') ||
           this.hasGlobalPermission('user:edit');
  }

  // Solo admins globales pueden ver tickets generales
  canViewTickets(): boolean {
    return this.isAdmin() || this.hasGlobalPermission('ticket:view');
  }

  canViewGroups(): boolean {
    if (this.hasGlobalPermission('group:view')) return true;
    const permisosPorGrupo = this.authService.getPermisosPorGrupo();
    return Object.values(permisosPorGrupo).some(perms => perms.includes('group:view'));
  }

  // Solo admins globales pueden crear tickets desde el dashboard
  canCreateTicket(): boolean {
    return this.hasGlobalPermission('ticket:create');
  }

  // ── Helpers ─────────────────────────────────────────────

  resetTicketForm(): void {
    this.ticketForm.reset({ grupo_id: '', titulo: '', descripcion: '', prioridad_id: '', asignado_id: '' });
  }

  private refresh(): void {
    this.ngZone.run(() => { this.cdr.markForCheck(); });
  }

  private mapTicket(t: any): any {
    return {
      id: t.id,
      title: t.titulo,
      status: t.estado_nombre     || 'To-Do',
      statusColor: t.estado_color  || '#9a8082',
      priority: t.prioridad_nombre || 'Media',
      priorityColor: t.prioridad_color || '#C97B8A',
      assignedTo: t.asignado_nombre  || 'No asignado',
      asignado_id: t.asignado_id,
      grupoNombre: t.grupo_nombre    || '',
      grupoId: t.grupo_id,
      dueDate: t.fecha_final ? new Date(t.fecha_final) : undefined
    };
  }

  // ── Carga de datos ───────────────────────────────────────

  cargarEstadisticas(): void {
    const userId  = this.authService.getUserId();
    const isAdmin = this.isAdmin();

    if (isAdmin) {
      // Admin ve estadísticas globales de todos los tickets
      this.ticketService.getEstadisticas().subscribe({
        next: (res) => {
          if (res?.statusCode === 200 && res?.data) {
            const data = Array.isArray(res.data) ? res.data[0] : res.data;
            if (!data) { this.refresh(); return; }
            this.totalTickets = Number(data.total) || 0;
            if (data.porEstado?.length > 0) {
              const find = (n: string) => Number(data.porEstado.find((e: any) => e.nombre === n)?.count) || 0;
              this.stats[0].value = find('To-Do');
              this.stats[1].value = find('In Progress');
              this.stats[2].value = find('Done');
              this.stats[3].value = find('Blocked');
              this.stats[4].value = find('Review');
              this.completionRate = this.totalTickets > 0
                ? Math.round((this.stats[2].value / this.totalTickets) * 100) : 0;
            }
          }
          this.refresh();
        },
        error: (err) => { console.error(err); this.refresh(); }
      });
    } else {
      // Usuario normal: solo sus tickets asignados
      if (!userId) return;
      this.ticketService.getTickets({ asignado_id: userId }).subscribe({
        next: (res) => {
          if (res?.statusCode === 200 && res?.data) {
            const tickets = res.data.filter((t: any) => t.asignado_id === userId);
            this.totalTickets = tickets.length;
            const counts: { [k: string]: number } = { 'To-Do': 0, 'In Progress': 0, 'Done': 0, 'Blocked': 0, 'Review': 0 };
            tickets.forEach((t: any) => { if (counts[t.estado_nombre] !== undefined) counts[t.estado_nombre]++; });
            this.stats[0].value = counts['To-Do'];
            this.stats[1].value = counts['In Progress'];
            this.stats[2].value = counts['Done'];
            this.stats[3].value = counts['Blocked'];
            this.stats[4].value = counts['Review'];
            this.completionRate = this.totalTickets > 0
              ? Math.round((counts['Done'] / this.totalTickets) * 100) : 0;
          }
          this.refresh();
        },
        error: (err) => { console.error(err); this.refresh(); }
      });
    }
  }

  cargarTicketsRecientes(): void {
    const userId  = this.authService.getUserId();
    const isAdmin = this.isAdmin();

    if (isAdmin) {
      // Admin ve todos los tickets recientes
      this.ticketService.getTickets().subscribe({
        next: (res) => {
          if (res?.statusCode === 200 && res?.data)
            this.recentTickets = res.data.slice(0, 5).map((t: any) => this.mapTicket(t));
          this.refresh();
        },
        error: (err) => { console.error(err); this.refresh(); }
      });
    } else {
      // Usuario normal: solo sus tickets asignados
      if (!userId) return;
      this.ticketService.getTickets({ asignado_id: userId }).subscribe({
        next: (res) => {
          if (res?.statusCode === 200 && res?.data) {
            const asignados = res.data.filter((t: any) => t.asignado_id === userId);
            this.recentTickets = asignados.slice(0, 3).map((t: any) => this.mapTicket(t));
          }
          this.refresh();
        },
        error: (err) => { console.error(err); this.refresh(); }
      });
    }
  }

  cargarMisTickets(): void {
    const userId = this.authService.getUserId();
    if (!userId) return;

    this.ticketService.getTickets({ asignado_id: userId }).subscribe({
      next: (res) => {
        if (res?.statusCode === 200 && res?.data) {
          this.myTickets = res.data
            .filter((t: any) => t.asignado_id === userId)
            .map((t: any) => this.mapTicket(t));
        } else {
          this.myTickets = [];
        }
        this.refresh();
      },
      error: (err) => { console.error(err); this.myTickets = []; this.refresh(); }
    });
  }

  cargarMisGrupos(): void {
    const userId  = this.authService.getUserId();
    const isAdmin = this.isAdmin();
    if (!userId) return;

    if (isAdmin) {
      // Admin carga TODOS los grupos para el select del modal
      this.groupService.getGroups().subscribe({
        next: (res) => {
          if (res?.statusCode === 200 && res?.data && res.data.length > 0) {
            const grupos = res.data;
            this.gruposList = grupos.map((g: any) => ({ label: g.nombre, value: g.id }));
            this.misGrupos  = grupos.map((g: any) => ({
              id: g.id, nombre: g.nombre,
              descripcion: g.descripcion || 'Sin descripcion',
              integrantes: 0, tickets: 0
            }));

            if (this.gruposList.length > 0 && !this.selectedGrupoId) {
              this.selectedGrupoId = this.gruposList[0].value;
              this.onGrupoComboChange(this.selectedGrupoId);
            }

            grupos.forEach((group: any, index: number) => {
              this.groupService.getMembers(group.id).subscribe({
                next: (r) => {
                  if (r?.statusCode === 200 && r?.data) this.misGrupos[index].integrantes = r.data.length;
                  this.refresh();
                }
              });
              this.ticketService.getTickets({ grupo_id: group.id }).subscribe({
                next: (r) => {
                  if (r?.statusCode === 200 && r?.data) this.misGrupos[index].tickets = r.data.length;
                  this.refresh();
                }
              });
            });
          } else {
            this.misGrupos = []; this.gruposList = [];
          }
          this.refresh();
        },
        error: (err) => { console.error(err); this.misGrupos = []; this.gruposList = []; this.refresh(); }
      });
    } else {
      // Usuario normal: solo sus grupos como miembro
      this.groupService.getUserGroups(userId).subscribe({
        next: (res) => {
          if (res?.statusCode === 200 && res?.data && res.data.length > 0) {
            const grupos = res.data;

            // Usuario normal NO tiene acceso al modal de crear ticket,
            // pero sí necesita gruposList para el combo de filtro del dashboard
            this.gruposList = grupos.map((g: any) => ({ label: g.nombre, value: g.id }));
            this.misGrupos  = grupos.map((g: any) => ({
              id: g.id, nombre: g.nombre,
              descripcion: g.descripcion || 'Sin descripcion',
              integrantes: 0, tickets: 0
            }));

            if (this.gruposList.length > 0 && !this.selectedGrupoId) {
              this.selectedGrupoId = this.gruposList[0].value;
              this.onGrupoComboChange(this.selectedGrupoId);
            }

            grupos.forEach((group: any, index: number) => {
              this.groupService.getMembers(group.id).subscribe({
                next: (r) => {
                  if (r?.statusCode === 200 && r?.data) this.misGrupos[index].integrantes = r.data.length;
                  this.refresh();
                }
              });
              this.ticketService.getTickets({ grupo_id: group.id }).subscribe({
                next: (r) => {
                  if (r?.statusCode === 200 && r?.data) this.misGrupos[index].tickets = r.data.length;
                  this.refresh();
                }
              });
            });
          } else {
            this.misGrupos = []; this.gruposList = [];
          }
          this.refresh();
        },
        error: (err) => { console.error(err); this.misGrupos = []; this.gruposList = []; this.refresh(); }
      });
    }
  }

  // ── Eventos de UI ────────────────────────────────────────

  onGrupoComboChange(grupoId: string): void {
    if (!grupoId) return;
    this.selectedGrupoId = grupoId;
    this.cargarTicketsDeGrupoAsignados(grupoId);
    this.cargarAsignados(grupoId);
  }

  cargarTicketsDeGrupoAsignados(grupoId: string): void {
    const userId  = this.authService.getUserId();
    const isAdmin = this.isAdmin();

    if (isAdmin) {
      // Admin ve todos los tickets del grupo
      this.ticketService.getTickets({ grupo_id: grupoId }).subscribe({
        next: (res) => {
          if (res?.statusCode === 200 && res?.data) {
            this.grupoTickets = res.data.map((t: any) => this.mapTicket(t));
          } else {
            this.grupoTickets = [];
          }
          this.refresh();
        },
        error: (err) => { console.error(err); this.grupoTickets = []; this.refresh(); }
      });
    } else {
      // Usuario normal: solo sus tickets asignados en ese grupo
      if (!userId) return;
      this.ticketService.getTickets({ grupo_id: grupoId, asignado_id: userId }).subscribe({
        next: (res) => {
          if (res?.statusCode === 200 && res?.data) {
            this.grupoTickets = res.data
              .filter((t: any) => t.asignado_id === userId)
              .map((t: any) => this.mapTicket(t));
          } else {
            this.grupoTickets = [];
          }
          this.refresh();
        },
        error: (err) => { console.error(err); this.grupoTickets = []; this.refresh(); }
      });
    }
  }

  cargarAsignados(grupoId: string): void {
    this.groupService.getMembers(grupoId).subscribe({
      next: (res) => {
        this.asignadosList = (res?.statusCode === 200 && res?.data)
          ? res.data.map((u: any) => ({ label: u.nombre_completo || u.username, value: u.id }))
          : [];
        this.refresh();
      },
      error: () => { this.asignadosList = []; this.refresh(); }
    });
  }

  cargarPrioridades(): void {
    this.ticketService.getPrioridades().subscribe({
      next: (res) => {
        if (res?.statusCode === 200 && res?.data)
          this.prioridadesList = res.data.map((p: any) => ({ label: p.nombre, value: p.id, color: p.color }));
        this.refresh();
      },
      error: (err) => { console.error(err); this.refresh(); }
    });
  }

  cargarEstados(): void {
    this.ticketService.getEstados().subscribe({
      next: (res) => {
        if (res?.statusCode === 200 && res?.data) this.estadosList = res.data;
        this.refresh();
      },
      error: (err) => { console.error(err); this.refresh(); }
    });
  }

  getStatusCfg(status: string): any {
    const e = this.estadosList.find((e: any) => e.nombre === status);
    return e ? { label: e.nombre, bg: `${e.color}22`, color: e.color }
             : { label: status,   bg: '#e2e3e5',       color: '#383d41' };
  }

  isOverdue(ticket: any): boolean {
    return ticket.dueDate ? new Date() > ticket.dueDate && ticket.status !== 'Done' : false;
  }

  openGroup(group: any): void {
    this.router.navigate(['/app/tickets'], { queryParams: { grupoId: group.id } });
  }

  openCreateTicketModal(): void {
    // Solo admins globales pueden crear tickets desde el dashboard
    if (!this.canCreateTicket()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Sin permiso',
        detail: 'No tienes permiso para crear tickets.'
      });
      return;
    }

    if (this.gruposList.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Sin grupos', detail: 'No hay grupos disponibles.' });
      return;
    }

    this.resetTicketForm();
    this.showTicketModal = true;
  }

  onGrupoChange(event: any): void {
    const grupoId = event.value;
    if (grupoId) {
      this.cargarAsignados(grupoId);
      this.ticketForm.patchValue({ asignado_id: '' });
    }
  }

  verTicket(ticket: any): void {
    this.router.navigate(['/app/tickets', ticket.id]);
  }

  createTicket(): void {
    if (this.ticketForm.invalid) {
      this.ticketForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const userId    = this.authService.getUserId();
    const formValue = this.ticketForm.value;

    this.ticketService.createTicket({
      grupo_id:     formValue.grupo_id,
      titulo:       formValue.titulo,
      descripcion:  formValue.descripcion,
      autor_id:     userId,
      asignado_id:  formValue.asignado_id || userId,
      prioridad_id: formValue.prioridad_id || null
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.showTicketModal = false;
        if (response.statusCode === 201) {
          this.messageService.add({
            severity: 'success',
            summary: 'Ticket creado',
            detail: 'El ticket se ha creado correctamente'
          });
          this.cargarEstadisticas();
          this.cargarTicketsRecientes();
          this.cargarMisTickets();
          if (this.selectedGrupoId) this.cargarTicketsDeGrupoAsignados(this.selectedGrupoId);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: response.data?.[0]?.error || 'Error al crear ticket'
          });
        }
        this.refresh();
      },
      error: (error) => {
        this.isLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.data?.[0]?.error || 'Error de conexion'
        });
        this.refresh();
      }
    });
  }
}