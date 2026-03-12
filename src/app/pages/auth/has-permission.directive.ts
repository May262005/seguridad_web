// ─────────────────────────────────────────────
//  has-permission.directive.ts
//  Uso: *hasPermission="'group:add'"
//       *hasPermission="['group:add','group:edit']"  (ANY)
//       *hasPermission="'group:add'; all: true"       (ALL)
// ─────────────────────────────────────────────
import {
  Directive, Input, TemplateRef,
  ViewContainerRef, OnInit, OnDestroy, inject, effect
} from '@angular/core';
import { AuthService } from './auth.service';
import { Permission } from './auth.models';

@Directive({
  selector: '[hasPermission]',
  standalone: true,
})
export class HasPermissionDirective implements OnInit, OnDestroy {

  @Input() hasPermission!: Permission | Permission[];
  /** Si true, el usuario debe tener TODOS los permisos; si false (default), con uno basta */
  @Input() hasPermissionAll = false;

  private auth    = inject(AuthService);
  private tpl     = inject(TemplateRef<unknown>);
  private vcr     = inject(ViewContainerRef);
  private created = false;

  // Reacciona automáticamente cuando cambia el usuario (signal)
  private _effect = effect(() => {
    this.auth.currentUser(); // suscribe al signal
    this.updateView();
  });

  ngOnInit(): void {
    this.updateView();
  }

  ngOnDestroy(): void {
    this._effect.destroy();
  }

  private updateView(): void {
    const perms = Array.isArray(this.hasPermission)
      ? this.hasPermission
      : [this.hasPermission];

    const allowed = this.hasPermissionAll
      ? this.auth.hasAllPermissions(perms)
      : this.auth.hasAnyPermission(perms);

    if (allowed && !this.created) {
      this.vcr.createEmbeddedView(this.tpl);
      this.created = true;
    } else if (!allowed && this.created) {
      this.vcr.clear();
      this.created = false;
    }
  }
}
