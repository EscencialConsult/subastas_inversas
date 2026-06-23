// Permisos visuales: qué puede hacer cada rol en el módulo de usuarios.
//
// OJO: esto controla lo que se MUESTRA. La seguridad real la hace el backend.
// El frontend nunca es la última línea de defensa, pero sí evita mostrar
// botones que el usuario no puede usar.

import { ROLES } from '../domain/roles.js'

// Quién administra los usuarios INTERNOS de una empresa: solo el admin del tenant.
// El super-admin NO gestiona usuarios internos de los clientes; su trabajo es
// administrar los tenants y crear el admin inicial de cada uno.
export function puedeGestionarUsuarios(rol) {
  return rol === ROLES.ADMIN_TENANT
}

export function puedeGestionarTenants(rol) {
  return rol === ROLES.SUPER_ADMIN
}

export function esProveedor(rol) {
  return rol === ROLES.PROVEEDOR
}

// Quién gestiona los procesos de compra: el comprador.
// (Más adelante, evaluador/aprobador/auditor podrán verlos según su etapa.)
export function puedeGestionarCompras(rol) {
  return rol === ROLES.COMPRADOR || rol === ROLES.ADMIN_TENANT
}

export function puedeConfigurarEmpresa(rol) {
  return rol === ROLES.ADMIN_TENANT
}

// Quién autoriza/rechaza los procesos en el circuito: el aprobador.
export function puedeAprobarCompras(rol) {
  return rol === ROLES.APROBADOR
}

// Quién evalúa las ofertas tras la subasta: el evaluador.
export function puedeEvaluar(rol) {
  return rol === ROLES.EVALUADOR
}

// Quién audita: el auditor. Acceso de SOLO LECTURA a todo el expediente.
export function puedeAuditar(rol) {
  return rol === ROLES.AUDITOR
}
