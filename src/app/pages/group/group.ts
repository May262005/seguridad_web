import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule }   from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule }    from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';

export interface Group {
  id:          number;
  name:        string;
  description: string;
  level:       string;
  total:       number;
}

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TagModule, AvatarModule],
  templateUrl: './group.html',
  styleUrl:    './group.css'
})
export class GroupComponent implements OnInit {

  totalGroups:   number = 0;
  advanceGroups: number = 0;

  groups: Group[] = [
    { id: 1, name: 'Grupo A', description: 'Grupo de nivel básico.',    level: 'Básico',    total: 12 },
  ];

  ngOnInit(): void {
    this.totalGroups   = this.groups.length;
  }
}