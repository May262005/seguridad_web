import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule }          from 'primeng/card';
import { ButtonModule }        from 'primeng/button';
import { TagModule }           from 'primeng/tag';
import { DialogModule }        from 'primeng/dialog';
import { InputTextModule }     from 'primeng/inputtext';
import { InputNumberModule }   from 'primeng/inputnumber';
import { Select }              from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

export interface Group {
  id:          number;
  nombre:      string;
  descripcion: string;
  nivel:       string;
  autor:       string;
  integrantes: number;
  tickets:     number;
}

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    CardModule, ButtonModule, TagModule,
    DialogModule, InputTextModule, InputNumberModule,
    Select, ConfirmDialogModule
  ],
  providers: [ConfirmationService],
  templateUrl: './group.html',
  styleUrl:    './group.css'
})
export class GroupComponent implements OnInit {

  totalGroups = 0;
  showDialog  = false;
  isEditing   = false;
  viewMode    = false;

  nivelOptions = [
    { label: 'Básico',     value: 'Básico'     },
    { label: 'Intermedio', value: 'Intermedio' },
    { label: 'Avanzado',   value: 'Avanzado'   },
  ];

  emptyGroup(): Group {
    return { id: 0, nombre: '', descripcion: '', nivel: 'Básico', autor: '', integrantes: 0, tickets: 0 };
  }

  currentGroup: Group = this.emptyGroup();

  groups: Group[] = [
    { id: 1, nombre: 'Grupo A', descripcion: 'Grupo de nivel básico.',     nivel: 'Básico',     autor: 'Ana López',    integrantes: 12, tickets: 3 },
    { id: 2, nombre: 'Grupo B', descripcion: 'Grupo de nivel intermedio.', nivel: 'Intermedio', autor: 'Carlos Ruiz',  integrantes: 8,  tickets: 5 },
    { id: 3, nombre: 'Grupo C', descripcion: 'Grupo de nivel avanzado.',   nivel: 'Avanzado',   autor: 'María Torres', integrantes: 5,  tickets: 1 },
  ];

  constructor(private confirmationService: ConfirmationService) {}

  ngOnInit(): void {
    this.totalGroups = this.groups.length;
  }

  openNew(): void {
    this.currentGroup = this.emptyGroup();
    this.isEditing    = false;
    this.viewMode     = false;
    this.showDialog   = true;
  }

  openView(group: Group): void {
    this.currentGroup = { ...group };
    this.viewMode     = true;
    this.isEditing    = false;
    this.showDialog   = true;
  }

  openEdit(group: Group): void {
    this.currentGroup = { ...group };
    this.isEditing    = true;
    this.viewMode     = false;
    this.showDialog   = true;
  }

  save(): void {
    if (!this.currentGroup.nombre.trim()) return;
    if (this.isEditing) {
      const idx = this.groups.findIndex(g => g.id === this.currentGroup.id);
      if (idx !== -1) this.groups[idx] = { ...this.currentGroup };
    } else {
      const newId = this.groups.length ? Math.max(...this.groups.map(g => g.id)) + 1 : 1;
      this.groups.push({ ...this.currentGroup, id: newId });
    }
    this.totalGroups = this.groups.length;
    this.showDialog  = false;
  }

  delete(group: Group): void {
    this.confirmationService.confirm({
      message: `¿Eliminar "${group.nombre}"?`,
      header:  'Confirmar',
      icon:    'pi pi-trash',
      accept:  () => {
        this.groups      = this.groups.filter(g => g.id !== group.id);
        this.totalGroups = this.groups.length;
      }
    });
  }

  dialogTitle(): string {
    if (this.viewMode)  return 'Detalle del grupo';
    if (this.isEditing) return 'Editar grupo';
    return 'Nuevo grupo';
  }
}