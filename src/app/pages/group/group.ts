// ─────────────────────────────────────────────
//  group.ts  –  Gestión de Grupos
// ─────────────────────────────────────────────
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule }        from '@angular/common';
import { FormsModule }         from '@angular/forms';
import { RouterModule }        from '@angular/router';
import { ButtonModule }        from 'primeng/button';
import { TagModule }           from 'primeng/tag';
import { DialogModule }        from 'primeng/dialog';
import { InputTextModule }     from 'primeng/inputtext';
import { InputNumberModule }   from 'primeng/inputnumber';
import { SelectModule }        from 'primeng/select';
import { ToastModule }         from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuthService }         from '../auth/auth.service';
import { TicketService }       from '../ticket-detail/ticket-service';
import { HasPermissionDirective } from '../auth/has-permission.directive';

export interface GroupMember {
  id:       number;
  fullName: string;
  email:    string;
  role:     string;
  avatar:   string;
}

export interface Group {
  id:          number;
  nombre:      string;
  descripcion: string;
  nivel:       'Básico' | 'Intermedio' | 'Avanzado';
  autor:       string;
  members:     GroupMember[];
  createdAt:   Date;
}

@Component({
  selector:    'app-group',
  standalone:  true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    ButtonModule, TagModule,
    DialogModule, InputTextModule, InputNumberModule,
    SelectModule, ToastModule, ConfirmDialogModule,
    HasPermissionDirective,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './group.html',
  styleUrl:    './group.css',
})
export class GroupComponent implements OnInit {

  auth = inject(AuthService);
  svc  = inject(TicketService);
  private msg  = inject(MessageService);
  private conf = inject(ConfirmationService);

  groups: Group[] = [
    {
      id: 1, nombre: 'Grupo A', descripcion: 'Equipo frontend — diseño y componentes UI.',
      nivel: 'Básico', autor: 'Super Administrador', createdAt: new Date('2025-01-05'),
      members: [
        { id: 2, fullName: 'Administrador de Grupo', email: 'admin@app.com',    role: 'groupAdmin', avatar: 'AG' },
        { id: 3, fullName: 'Miembro del Equipo',     email: 'miembro@app.com',  role: 'member',     avatar: 'ME' },
        { id: 5, fullName: 'Usuario General',        email: 'usuario@app.com',  role: 'member',     avatar: 'UG' },
      ],
    },
    {
      id: 2, nombre: 'Grupo B', descripcion: 'Equipo backend — APIs y base de datos.',
      nivel: 'Intermedio', autor: 'Administrador de Grupo', createdAt: new Date('2025-01-10'),
      members: [
        { id: 2, fullName: 'Administrador de Grupo', email: 'admin@app.com',    role: 'groupAdmin', avatar: 'AG' },
        { id: 4, fullName: 'Usuario Solo Lectura',   email: 'lectura@app.com',  role: 'readonly',   avatar: 'UL' },
      ],
    },
    {
      id: 3, nombre: 'Grupo C', descripcion: 'DevOps e infraestructura — CI/CD y despliegues.',
      nivel: 'Avanzado', autor: 'Super Administrador', createdAt: new Date('2025-01-15'),
      members: [
        { id: 5, fullName: 'Usuario General', email: 'usuario@app.com', role: 'member', avatar: 'UG' },
      ],
    },
  ];

  searchText = '';

  nivelOptions = [
    { label: 'Básico',     value: 'Básico'     },
    { label: 'Intermedio', value: 'Intermedio' },
    { label: 'Avanzado',   value: 'Avanzado'   },
  ];

  nivelColors: Record<string, { color: string; bg: string }> = {
    'Básico':     { color: '#6db98a', bg: '#e8fdf0' },
    'Intermedio': { color: '#C97B8A', bg: '#fde8f0' },
    'Avanzado':   { color: '#7b9ec9', bg: '#e8f0fd' },
  };

  showDialog  = false;
  isEditing   = false;
  viewMode    = false;
  currentGroup: Group = this.emptyGroup();

  // ── Dialog miembros ───────────────────────────
  showMembers    = false;
  membersGroup:  Group | null = null;
  newMemberEmail = '';
  newMemberName  = '';
  newMemberRole  = 'member';

  memberRoleOptions = [
    { label: 'Admin de Grupo', value: 'groupAdmin' },
    { label: 'Miembro',        value: 'member'     },
    { label: 'Solo lectura',   value: 'readonly'   },
  ];

  ngOnInit(): void {}

  private emptyGroup(): Group {
    return {
      id: 0, nombre: '', descripcion: '',
      nivel: 'Básico', autor: this.auth.userFullName(),
      members: [], createdAt: new Date(),
    };
  }

  get filteredGroups(): Group[] {
    if (!this.searchText.trim()) return this.groups;
    const q = this.searchText.toLowerCase();
    return this.groups.filter(g =>
      g.nombre.toLowerCase().includes(q) ||
      g.autor.toLowerCase().includes(q)  ||
      g.nivel.toLowerCase().includes(q)
    );
  }

  get totalGroups()  { return this.groups.length; }
  get totalMembers() { return this.groups.reduce((s, g) => s + g.members.length, 0); }
  get totalTickets() { return this.groups.reduce((s, g) => s + this.ticketCount(g.id), 0); }

  ticketCount(groupId: number): number {
    return this.svc.getCountByGroupId(groupId);
  }

  // ── CRUD Grupos ───────────────────────────────
  openNew(): void {
    this.currentGroup = this.emptyGroup();
    this.isEditing = false; this.viewMode = false;
    this.showDialog = true;
  }

  openView(group: Group): void {
    this.currentGroup = { ...group, members: [...group.members] };
    this.viewMode = true; this.isEditing = false;
    this.showDialog = true;
  }

  openEdit(group: Group): void {
    this.currentGroup = { ...group, members: [...group.members] };
    this.isEditing = true; this.viewMode = false;
    this.showDialog = true;
  }

  save(): void {
    if (!this.currentGroup.nombre.trim()) {
      this.msg.add({ severity: 'warn', summary: 'Campo requerido', detail: 'El nombre es obligatorio.', life: 2500 });
      return;
    }
    if (this.isEditing) {
      const idx = this.groups.findIndex(g => g.id === this.currentGroup.id);
      if (idx !== -1) this.groups[idx] = { ...this.currentGroup };
      this.msg.add({ severity: 'success', summary: 'Grupo actualizado', detail: `"${this.currentGroup.nombre}" guardado.`, life: 2500 });
    } else {
      const newId = this.groups.length ? Math.max(...this.groups.map(g => g.id)) + 1 : 1;
      this.groups.push({ ...this.currentGroup, id: newId, createdAt: new Date() });
      this.msg.add({ severity: 'success', summary: 'Grupo creado', detail: `"${this.currentGroup.nombre}" añadido.`, life: 2500 });
    }
    this.showDialog = false;
  }

  delete(group: Group): void {
    this.conf.confirm({
      message: `¿Eliminar el grupo "${group.nombre}"?`,
      header: 'Eliminar grupo', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar', rejectLabel: 'Cancelar',
      accept: () => {
        this.groups = this.groups.filter(g => g.id !== group.id);
        this.msg.add({ severity: 'warn', summary: 'Eliminado', detail: `"${group.nombre}" eliminado.`, life: 2500 });
      },
    });
  }

  // ── Gestión de miembros ───────────────────────
  openMembers(group: Group): void {
    this.membersGroup   = group;
    this.newMemberEmail = '';
    this.newMemberName  = '';
    this.newMemberRole  = 'member';
    this.showMembers    = true;
  }

  addMember(): void {
    if (!this.newMemberEmail.trim()) {
      this.msg.add({ severity: 'warn', summary: 'Email requerido', detail: 'Ingresa el correo del miembro.', life: 2500 });
      return;
    }
    if (!this.newMemberEmail.includes('@')) {
      this.msg.add({ severity: 'warn', summary: 'Email inválido', detail: 'El correo no tiene un formato válido.', life: 2500 });
      return;
    }
    if (!this.membersGroup) return;

    const already = this.membersGroup.members.some(
      m => m.email.toLowerCase() === this.newMemberEmail.toLowerCase()
    );
    if (already) {
      this.msg.add({ severity: 'warn', summary: 'Ya existe', detail: 'Este correo ya es miembro del grupo.', life: 2500 });
      return;
    }

    const name     = this.newMemberName.trim() || this.newMemberEmail.split('@')[0];
    const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
    const newId    = Math.max(0, ...this.membersGroup.members.map(m => m.id)) + 1;

    this.membersGroup.members.push({
      id: newId, fullName: name,
      email: this.newMemberEmail.trim(),
      role: this.newMemberRole, avatar: initials,
    });

    const idx = this.groups.findIndex(g => g.id === this.membersGroup!.id);
    if (idx !== -1) this.groups[idx] = { ...this.membersGroup };

    this.msg.add({ severity: 'success', summary: 'Miembro agregado', detail: `${name} fue añadido al grupo.`, life: 2500 });
    this.newMemberEmail = '';
    this.newMemberName  = '';
    this.newMemberRole  = 'member';
  }

  removeMember(member: GroupMember): void {
    if (!this.membersGroup) return;
    this.membersGroup.members = this.membersGroup.members.filter(m => m.id !== member.id);
    const idx = this.groups.findIndex(g => g.id === this.membersGroup!.id);
    if (idx !== -1) this.groups[idx] = { ...this.membersGroup };
    this.msg.add({ severity: 'warn', summary: 'Miembro removido', detail: `${member.fullName} fue removido.`, life: 2000 });
  }

  get dialogTitle(): string {
    if (this.viewMode)  return 'Detalle del grupo';
    if (this.isEditing) return 'Editar grupo';
    return 'Nuevo grupo';
  }

  nivelColor(nivel: string) { return this.nivelColors[nivel] ?? { color: '#9a8082', bg: '#F2EDE4' }; }

  rolLabel(role: string): string {
    const map: Record<string, string> = {
      superAdmin: 'Super Admin', groupAdmin: 'Admin', member: 'Miembro', readonly: 'Lectura',
    };
    return map[role] ?? role;
  }
}