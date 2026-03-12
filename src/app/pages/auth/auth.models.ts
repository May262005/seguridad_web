// ─────────────────────────────────────────────
//  auth.models.ts  –  Interfaces y tipos
// ─────────────────────────────────────────────

/** Todos los permisos posibles del sistema */
export type Permission =
  // Grupos
  | 'group:view'
  | 'group:add'
  | 'group:edit'
  | 'group:delete'
  // Ticketsa
  | 'ticket:view'
  | 'ticket:create'
  | 'ticket:edit'
  | 'ticket:delete'
  | 'ticket:assign'
  | 'ticket:comment'
  | 'ticket:status'
  // Usuarios
  | 'user:view'
  | 'user:create'
  | 'user:edit'
  | 'user:delete'
  | 'user:manage-permissions'
  // Admin
  | 'admin:full';

/** Roles del sistema */
export type Role = 'superAdmin' | 'groupAdmin' | 'member' | 'readonly';

/** Usuario autenticado */
export interface AuthUser {
  id:          number;
  email:       string;
  password:    string;          // solo para validación local (hardcoded)
  username:    string;
  fullName:    string;
  phone:       string;
  address:     string;
  birthDate:   Date;
  role:        Role;
  permissions: Permission[];
  groupIds:    number[];        // grupos a los que pertenece
  avatar?:     string;         // iniciales o url
}

/** Payload que se guarda en sessionStorage */
export interface SessionPayload {
  userId:      number;
  email:       string;
  role:        Role;
  permissions: Permission[];
  groupIds:    number[];
}