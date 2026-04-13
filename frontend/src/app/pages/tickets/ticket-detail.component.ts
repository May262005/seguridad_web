import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    ButtonModule, DialogModule, SelectModule,
    InputTextModule, TextareaModule, ToastModule, ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './ticket-detail.component.html',
  styleUrls: ['./ticket-detail.component.css']
})
export class TicketDetailComponent implements OnInit {

  ticket: any = null;
  comentarios: any[] = [];
  historial: any[] = [];
  estados: any[] = [];
  prioridades: any[] = [];
  miembrosList: any[] = [];

  activeTab: 'comentarios' | 'historial' = 'comentarios';
  isLoading = false;
  isSaving  = false;

  isEditingTitulo      = false;
  isEditingDescripcion = false;
  editTitulo      = '';
  editDescripcion = '';

  nuevoComentario    = '';
  enviandoComentario = false;

  showMoveModal      = false;
  nuevoEstadoId      = '';
  showAsignarModal   = false;
  nuevoAsignadoId    = '';
  showPrioridadModal = false;
  nuevaPrioridadId   = '';

  editForm: FormGroup;

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
    this.editForm = this.fb.group({
      titulo:      ['', [Validators.required, Validators.minLength(5)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    // Refresca permisos globales + por grupo antes de mostrar acciones
    this.authService.refreshPermisos().then(() => {
      this.route.params.subscribe(params => {
        const id = params['id'];
        if (id) {
          this.cargarTodo(id);
          this.cargarEstados();
          this.cargarPrioridades();
        }
      });
    });
  }

  private refresh(): void {
    this.ngZone.run(() => { this.cdr.markForCheck(); this.cdr.detectChanges(); });
  }

  hasPermission(p: Permission, grupoId?: string): boolean {
    return this.authService.hasPermission(p, grupoId);
  }

  get userId(): string {
    return this.authService.getUserId() || '';
  }

  // ── Permisos usando grupo del ticket ─────────────────────
  get canEdit(): boolean {
    return this.ticket?.autor_id === this.userId ||
           this.hasPermission('ticket:edit', this.ticket?.grupo_id);
  }

  get canMove(): boolean {
    return this.ticket?.asignado_id === this.userId ||
           this.hasPermission('ticket:move', this.ticket?.grupo_id);
  }

  get canDelete(): boolean {
    return this.ticket?.autor_id === this.userId ||
           this.hasPermission('ticket:delete', this.ticket?.grupo_id);
  }

  cargarTodo(id: string): void {
    this.cargarTicket(id);
    this.cargarComentarios(id);
    this.cargarHistorial(id);
  }

  cargarTicket(id: string): void {
    this.isLoading = true;
    this.ticketService.getTicketById(id).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res?.statusCode === 200 && res?.data) {
          this.ticket          = Array.isArray(res.data) ? res.data[0] : res.data;
          this.editTitulo      = this.ticket.titulo;
          this.editDescripcion = this.ticket.descripcion;
          this.nuevoEstadoId   = this.ticket.estado_id;
          this.nuevaPrioridadId = this.ticket.prioridad_id;
          this.nuevoAsignadoId  = this.ticket.asignado_id;
          if (this.ticket.grupo_id) this.cargarMiembros(this.ticket.grupo_id);
        }
        this.refresh();
      },
      error: () => { this.isLoading = false; this.refresh(); }
    });
  }

  cargarComentarios(id: string): void {
    this.ticketService.getComentarios(id).subscribe({
      next: (res) => { if (res?.statusCode === 200 && res?.data) this.comentarios = res.data; this.refresh(); },
      error: () => this.refresh()
    });
  }

  cargarHistorial(id: string): void {
    this.ticketService.getHistorial(id).subscribe({
      next: (res) => { if (res?.statusCode === 200 && res?.data) this.historial = res.data; this.refresh(); },
      error: () => this.refresh()
    });
  }

  cargarEstados(): void {
    this.ticketService.getEstados().subscribe({
      next: (res) => { if (res?.statusCode === 200 && res?.data) this.estados = res.data; this.refresh(); },
      error: () => this.refresh()
    });
  }

  cargarPrioridades(): void {
    this.ticketService.getPrioridades().subscribe({
      next: (res) => { if (res?.statusCode === 200 && res?.data) this.prioridades = res.data; this.refresh(); },
      error: () => this.refresh()
    });
  }

  cargarMiembros(grupoId: string): void {
    this.groupService.getMembers(grupoId).subscribe({
      next: (res) => {
        if (res?.statusCode === 200 && res?.data)
          this.miembrosList = res.data.map((u: any) => ({ label: u.nombre_completo || u.username, value: u.id }));
        this.refresh();
      },
      error: () => this.refresh()
    });
  }

  startEditTitulo(): void {
    if (!this.canEdit) return;
    this.editTitulo = this.ticket.titulo;
    this.isEditingTitulo = true;
  }

  cancelEditTitulo(): void {
    this.isEditingTitulo = false;
    this.editTitulo = this.ticket.titulo;
  }

  saveTitulo(): void {
    if (!this.editTitulo || this.editTitulo.length < 5) return;
    this.isSaving = true;
    this.ticketService.updateTicket(this.ticket.id, { titulo: this.editTitulo, usuario_id: this.userId }).subscribe({
      next: (res) => {
        this.isSaving = false; this.isEditingTitulo = false;
        if (res?.statusCode === 200) {
          this.ticket.titulo = this.editTitulo;
          this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Título actualizado' });
          this.cargarHistorial(this.ticket.id);
        }
        this.refresh();
      },
      error: () => { this.isSaving = false; this.refresh(); }
    });
  }

  startEditDescripcion(): void {
    if (!this.canEdit) return;
    this.editDescripcion = this.ticket.descripcion;
    this.isEditingDescripcion = true;
  }

  cancelEditDescripcion(): void {
    this.isEditingDescripcion = false;
    this.editDescripcion = this.ticket.descripcion;
  }

  saveDescripcion(): void {
    if (!this.editDescripcion || this.editDescripcion.length < 10) return;
    this.isSaving = true;
    this.ticketService.updateTicket(this.ticket.id, { descripcion: this.editDescripcion, usuario_id: this.userId }).subscribe({
      next: (res) => {
        this.isSaving = false; this.isEditingDescripcion = false;
        if (res?.statusCode === 200) {
          this.ticket.descripcion = this.editDescripcion;
          this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Descripción actualizada' });
          this.cargarHistorial(this.ticket.id);
        }
        this.refresh();
      },
      error: () => { this.isSaving = false; this.refresh(); }
    });
  }

  openMoveModal(): void {
    this.nuevoEstadoId = this.ticket.estado_id;
    this.showMoveModal = true;
  }

  moveTicket(): void {
    if (!this.nuevoEstadoId) return;
    this.ticketService.changeStatus(this.ticket.id, this.nuevoEstadoId, this.userId).subscribe({
      next: (res) => {
        this.showMoveModal = false;
        if (res?.statusCode === 200) {
          const estado = this.estados.find(e => e.id === this.nuevoEstadoId);
          this.ticket.estado_id     = this.nuevoEstadoId;
          this.ticket.estado_nombre = estado?.nombre;
          this.ticket.estado_color  = estado?.color;
          this.messageService.add({ severity: 'success', summary: 'Estado actualizado', detail: `Movido a "${estado?.nombre}"` });
          this.cargarHistorial(this.ticket.id);
        }
        this.refresh();
      },
      error: () => { this.showMoveModal = false; this.refresh(); }
    });
  }

  openAsignarModal(): void {
    this.nuevoAsignadoId = this.ticket.asignado_id;
    this.showAsignarModal = true;
  }

  saveAsignado(): void {
    if (!this.nuevoAsignadoId) return;
    this.ticketService.updateTicket(this.ticket.id, { asignado_id: this.nuevoAsignadoId, usuario_id: this.userId }).subscribe({
      next: (res) => {
        this.showAsignarModal = false;
        if (res?.statusCode === 200) {
          const miembro = this.miembrosList.find(m => m.value === this.nuevoAsignadoId);
          this.ticket.asignado_id     = this.nuevoAsignadoId;
          this.ticket.asignado_nombre = miembro?.label;
          this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Asignado actualizado' });
          this.cargarHistorial(this.ticket.id);
        }
        this.refresh();
      },
      error: () => { this.showAsignarModal = false; this.refresh(); }
    });
  }

  openPrioridadModal(): void {
    this.nuevaPrioridadId = this.ticket.prioridad_id;
    this.showPrioridadModal = true;
  }

  savePrioridad(): void {
    this.ticketService.updateTicket(this.ticket.id, { prioridad_id: this.nuevaPrioridadId || null, usuario_id: this.userId }).subscribe({
      next: (res) => {
        this.showPrioridadModal = false;
        if (res?.statusCode === 200) {
          const prioridad = this.prioridades.find(p => p.id === this.nuevaPrioridadId);
          this.ticket.prioridad_id     = this.nuevaPrioridadId;
          this.ticket.prioridad_nombre = prioridad?.nombre;
          this.ticket.prioridad_color  = prioridad?.color;
          this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Prioridad actualizada' });
          this.cargarHistorial(this.ticket.id);
        }
        this.refresh();
      },
      error: () => { this.showPrioridadModal = false; this.refresh(); }
    });
  }

  // ── Eliminar con confirmDialog (igual que tickets.component) ──
  eliminarTicket(): void {
    if (!this.canDelete) {
      this.messageService.add({ severity: 'error', summary: 'Sin permiso', detail: 'No tienes permiso para eliminar este ticket' });
      return;
    }

    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar el ticket "${this.ticket.titulo}"? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        this.ticketService.deleteTicket(this.ticket.id).subscribe({
          next: (res) => {
            if (res?.statusCode === 200) {
              this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Ticket eliminado correctamente' });
              this.router.navigate(['/app/tickets']);
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

  enviarComentario(): void {
    if (!this.nuevoComentario.trim()) return;
    this.enviandoComentario = true;
    this.ticketService.addComentario(this.ticket.id, this.userId, this.nuevoComentario.trim()).subscribe({
      next: (res) => {
        this.enviandoComentario = false;
        if (res?.statusCode === 201) {
          this.nuevoComentario = '';
          this.cargarComentarios(this.ticket.id);
          this.cargarHistorial(this.ticket.id);
          this.messageService.add({ severity: 'success', summary: 'Comentario agregado', detail: '' });
        }
        this.refresh();
      },
      error: () => { this.enviandoComentario = false; this.refresh(); }
    });
  }

  get estadosOpciones() { return this.estados.map(e => ({ label: e.nombre, value: e.id })); }
  get prioridadesOpciones() {
    return [{ label: 'Sin prioridad', value: '' }, ...this.prioridades.map(p => ({ label: p.nombre, value: p.id }))];
  }

  getPrioridadColor(nombre: string): string {
    return this.prioridades.find(x => x.nombre === nombre)?.color || '#C97B8A';
  }

  formatDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatDateShort(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  volver(): void { this.router.navigate(['/app/tickets']); }

  getInitials(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }
}