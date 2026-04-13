import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { AuthService, Permission } from '../../services/auth.service';
import { TicketService } from '../../services/ticket.service';
import { GroupService } from '../../services/group.service';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    InputTextModule,
    TextareaModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './tickets.component.html',
  styleUrls: ['./tickets.component.css']
})
export class TicketsComponent implements OnInit {

  viewMode: 'kanban' | 'lista' = 'kanban';
  allTickets: any[] = [];
  estados: any[] = [];
  prioridades: any[] = [];
  gruposList: any[] = [];
  miembrosList: any[] = [];
  grupoIdActivo: string = '';
  draggedTicket: any = null;

  showTicketModal = false;
  isLoading = false;
  ticketForm: FormGroup;

  showMoveModal = false;
  ticketToMove: any = null;
  nuevoEstadoId: string = '';

  constructor(
    private authService: AuthService,
    private ticketService: TicketService,
    private groupService: GroupService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
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
    this.ngZone.run(() => {
      // Refresca permisos desde el servidor al entrar al componente
      this.authService.refreshPermisos().then(() => {
        this.route.queryParams.subscribe(params => {
          this.grupoIdActivo = params['grupoId'] || '';
          this.cargarTodo();
        });
      });
    });
  }

  hasPermission(permission: Permission, grupoId?: string): boolean {
    return this.authService.hasPermission(permission, grupoId);
  }

  isAdminSistema(): boolean {
    return this.hasPermission('user:manage-permissions');
  }

  private refresh(): void {
    this.ngZone.run(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  cargarTodo(): void {
    this.cargarEstados();
    this.cargarPrioridades();
    this.cargarGrupos();
    this.cargarTickets();
  }

  cargarEstados(): void {
    this.ticketService.getEstados().subscribe({
      next: (res) => {
        if (res?.statusCode === 200 && res?.data) this.estados = res.data;
        this.refresh();
      },
      error: () => this.refresh()
    });
  }

  cargarPrioridades(): void {
    this.ticketService.getPrioridades().subscribe({
      next: (res) => {
        if (res?.statusCode === 200 && res?.data) this.prioridades = res.data;
        this.refresh();
      },
      error: () => this.refresh()
    });
  }

  cargarGrupos(): void {
    const userId  = this.authService.getUserId();
    const isAdmin = this.isAdminSistema();
    if (!userId) return;

    const obs = isAdmin
      ? this.groupService.getGroups()
      : this.groupService.getUserGroups(userId);

    obs.subscribe({
      next: (res) => {
        if (res?.statusCode === 200 && res?.data) {
          this.gruposList = res.data.map((g: any) => ({ label: g.nombre, value: g.id }));
        }
        this.refresh();
      },
      error: () => this.refresh()
    });
  }

  cargarMiembros(grupoId: string): void {
    this.groupService.getMembers(grupoId).subscribe({
      next: (res) => {
        if (res?.statusCode === 200 && res?.data) {
          this.miembrosList = res.data.map((u: any) => ({
            label: u.nombre_completo || u.username,
            value: u.id
          }));
        }
        this.refresh();
      },
      error: () => this.refresh()
    });
  }

  // ── Solo tickets asignados al usuario actual ─────────────
  // Si hay grupo activo: filtra por grupo + asignado
  // Si no hay grupo: filtra solo por asignado (todos sus grupos)
  cargarTickets(): void {
    const userId  = this.authService.getUserId();
    const isAdmin = this.isAdminSistema();
    if (!userId) return;

    // El admin ve todos los tickets; el resto solo los que tiene asignados
    const filtros: any = isAdmin ? {} : { asignado_id: userId };
    if (this.grupoIdActivo) {
      filtros.grupo_id = this.grupoIdActivo;
    }

    this.ticketService.getTickets(filtros).subscribe({
      next: (res) => {
        if (res?.statusCode === 200 && res?.data) {
          // Solo aplicar el filtro de asignado en cliente cuando NO es admin
          this.allTickets = isAdmin
            ? res.data
            : res.data.filter((t: any) => t.asignado_id === userId);
        } else {
          this.allTickets = [];
        }
        this.refresh();
      },
      error: () => { this.allTickets = []; this.refresh(); }
    });
  }

  onGrupoChange(grupoId: string): void {
    this.grupoIdActivo = grupoId;
    if (grupoId) {
      this.cargarMiembros(grupoId);
    } else {
      this.miembrosList = [];
    }
    this.cargarTickets();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: grupoId ? { grupoId } : {},
      queryParamsHandling: 'replace'
    });
  }

  getTicketsByEstado(estadoNombre: string): any[] {
    return this.allTickets.filter(t => t.estado_nombre === estadoNombre);
  }

  onDragStart(ticket: any): void {
    this.draggedTicket = ticket;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent, estadoNombre: string): void {
    event.preventDefault();
    if (!this.draggedTicket) return;
    if (!this.canMoveTicket(this.draggedTicket)) return;

    const estadoDestino = this.estados.find(e => e.nombre === estadoNombre);
    if (!estadoDestino || this.draggedTicket.estado_nombre === estadoNombre) {
      this.draggedTicket = null;
      return;
    }

    const userId = this.authService.getUserId();
    this.ticketService.changeStatus(this.draggedTicket.id, estadoDestino.id, userId!).subscribe({
      next: (res) => {
        if (res?.statusCode === 200) {
          this.messageService.add({ severity: 'success', summary: 'Estado actualizado', detail: `Ticket movido a "${estadoNombre}"` });
          this.cargarTickets();
        }
        this.draggedTicket = null;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo mover el ticket' });
        this.draggedTicket = null;
      }
    });
  }

  onDragEnd(): void {
    this.draggedTicket = null;
  }

  canMoveTicket(ticket: any): boolean {
    const userId     = this.authService.getUserId();
    const isAsignado = ticket.asignado_id === userId;
    const hasPerm    = this.hasPermission('ticket:move', ticket.grupo_id);
    return isAsignado || hasPerm;
  }

  canEditTicket(ticket: any): boolean {
    const userId = this.authService.getUserId();
    return ticket.autor_id === userId || this.hasPermission('ticket:edit', ticket.grupo_id);
  }

  canDeleteTicket(ticket: any): boolean {
    const userId = this.authService.getUserId();
    return ticket.autor_id === userId || this.hasPermission('ticket:delete', ticket.grupo_id);
  }

  // ── Permiso de crear: revisa globales Y permisos del grupo activo ──
  canCreateTicket(): boolean {
    // Admin siempre puede
    if (this.isAdminSistema()) return true;

    // Sin grupo activo seleccionado → ocultar
    if (!this.grupoIdActivo) return false;

    // Con grupo activo → revisar permiso en ese grupo
    return this.hasPermission('ticket:create', this.grupoIdActivo);
  }

  openCreateModal(): void {
    if (!this.canCreateTicket()) {
      this.messageService.add({ severity: 'error', summary: 'Sin permiso', detail: 'No tienes permiso para crear tickets' });
      return;
    }
    this.ticketForm.reset({
      grupo_id:     this.grupoIdActivo || '',
      titulo:       '',
      descripcion:  '',
      prioridad_id: '',
      asignado_id:  ''
    });
    if (this.grupoIdActivo) {
      this.cargarMiembros(this.grupoIdActivo);
    }
    this.showTicketModal = true;
  }

  onModalGrupoChange(grupoId: string): void {
    if (grupoId) {
      this.cargarMiembros(grupoId);
      this.ticketForm.patchValue({ asignado_id: '' });
    }
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
      next: (res) => {
        this.isLoading = false;
        this.showTicketModal = false;
        if (res?.statusCode === 201) {
          this.messageService.add({ severity: 'success', summary: 'Ticket creado', detail: 'El ticket se creó correctamente' });
          this.cargarTickets();
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el ticket' });
        }
      },
      error: () => {
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error de conexión' });
      }
    });
  }

  openMoveModal(ticket: any): void {
    if (!this.canMoveTicket(ticket)) return;
    this.ticketToMove  = ticket;
    this.nuevoEstadoId = ticket.estado_id;
    this.showMoveModal = true;
  }

  moveTicket(): void {
    if (!this.ticketToMove || !this.nuevoEstadoId) return;
    const userId = this.authService.getUserId();

    this.ticketService.changeStatus(this.ticketToMove.id, this.nuevoEstadoId, userId!).subscribe({
      next: (res) => {
        this.showMoveModal = false;
        if (res?.statusCode === 200) {
          this.messageService.add({ severity: 'success', summary: 'Estado actualizado', detail: 'El estado del ticket fue actualizado' });
          this.cargarTickets();
        }
        this.ticketToMove = null;
      },
      error: () => {
        this.showMoveModal = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el estado' });
        this.ticketToMove = null;
      }
    });
  }

  eliminarTicket(ticket: any, event: Event): void {
    event.stopPropagation();

    if (!this.canDeleteTicket(ticket)) {
      this.messageService.add({ severity: 'error', summary: 'Sin permiso', detail: 'No tienes permiso para eliminar este ticket' });
      return;
    }

    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar el ticket "${ticket.titulo}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        this.ticketService.deleteTicket(ticket.id).subscribe({
          next: (res) => {
            if (res?.statusCode === 200) {
              this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Ticket eliminado correctamente' });
              this.cargarTickets();
            } else {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el ticket' });
            }
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error de conexión' });
          }
        });
      }
    });
  }

  verTicket(ticket: any): void {
    this.router.navigate(['/app/tickets', ticket.id]);
  }

  getPrioridadColor(nombre: string): string {
    const p = this.prioridades.find(x => x.nombre === nombre);
    return p?.color || '#C97B8A';
  }

  getNombreGrupoActivo(): string {
    if (!this.grupoIdActivo) return 'Mis tickets';
    const g = this.gruposList.find(x => x.value === this.grupoIdActivo);
    return g?.label || 'Tickets';
  }

  get prioridadesOpciones() {
    return this.prioridades.map(p => ({ label: p.nombre, value: p.id }));
  }

  get estadosOpciones() {
    return this.estados.map(e => ({ label: e.nombre, value: e.id }));
  }
}