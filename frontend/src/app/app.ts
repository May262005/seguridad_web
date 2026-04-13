import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ButtonModule, RouterModule], 
  templateUrl: './app.html',
})
export class App {}