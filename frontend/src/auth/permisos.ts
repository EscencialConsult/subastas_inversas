// Permisos visuales: que puede hacer cada rol.
//
// La seguridad real la hace el backend. Esto solo controla visibilidad y rutas.

import { ROLES, type RolType } from '../domain/roles'

type RolVisual = RolType | string | null | undefined

export type PermisoVisual = (rol: RolVisual) => boolean

export function puedeGestionarUsuarios(rol: RolVisual) {
  return rol === ROLES.ADMINISTRADOR
}

export function puedeGestionarConfiguracion(rol: RolVisual) {
  return rol === ROLES.ADMINISTRADOR
}

export function puedeGestionarTenants(rol: RolVisual) {
  return rol === ROLES.SUPER_ADMIN
}

export function esProveedor(rol: RolVisual) {
  return rol === ROLES.PROVEEDOR
}

export function tienePanel(rol: RolVisual) {
  return rol !== ROLES.PROVEEDOR && rol !== ROLES.EVALUADOR
}

export function puedeGestionarCompras(rol: RolVisual) {
  return rol === ROLES.COMPRADOR
}

export function puedeVerProveedores(rol: RolVisual) {
  return rol === ROLES.COMPRADOR || rol === ROLES.ADMINISTRADOR || rol === ROLES.AUDITOR
}

export function puedeAprobarAdjudicacion(rol: RolVisual) {
  return rol === ROLES.AUTORIDAD
}

export function puedeEvaluar(rol: RolVisual) {
  return rol === ROLES.EVALUADOR
}

export function puedeSupervisar(rol: RolVisual) {
  return rol === ROLES.AUDITOR || rol === ROLES.ADMINISTRADOR
}
