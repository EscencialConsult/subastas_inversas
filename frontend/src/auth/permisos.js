// Permisos visuales: qué puede hacer cada rol.
//
// OJO: esto controla lo que se MUESTRA. La seguridad real la hace el backend.
// El frontend nunca es la última línea de defensa, pero sí evita mostrar
// botones que el usuario no puede usar.

import { ROLES } from '../domain/roles.js'

// Quién administra los usuarios INTERNOS de una empresa: solo su Administrador.
// El super-admin NO gestiona usuarios internos de los clientes; su trabajo es
// administrar las empresas y crear el administrador inicial de cada una.
export function puedeGestionarUsuarios(rol) {
  return rol === ROLES.ADMINISTRADOR
}

export function puedeGestionarTenants(rol) {
  return rol === ROLES.SUPER_ADMIN
}

export function esProveedor(rol) {
  return rol === ROLES.PROVEEDOR
}

// Quién tiene panel de inicio (dashboard): todos los roles internos.
// El proveedor tiene su propia home ("Mi cuenta"), no el panel.
export function tienePanel(rol) {
  return rol !== ROLES.PROVEEDOR
}

// Quién gestiona los procesos de compra (crear, publicar, subasta, adjudicar):
// el comprador.
export function puedeGestionarCompras(rol) {
  return rol === ROLES.COMPRADOR
}

// Quién ve el directorio de proveedores (red compartida): el comprador (para
// invitarlos) y la supervisión (administrador, auditor).
export function puedeVerProveedores(rol) {
  return (
    rol === ROLES.COMPRADOR ||
    rol === ROLES.ADMINISTRADOR ||
    rol === ROLES.AUDITOR
  )
}

// Quién APRUEBA las adjudicaciones (según monto): la Autoridad.
export function puedeAprobarAdjudicacion(rol) {
  return rol === ROLES.AUTORIDAD
}

// Quién valida la documentación de proveedores: el evaluador.
// (Su pantalla vive en el módulo de proveedores, todavía por construir.)
export function puedeEvaluar(rol) {
  return rol === ROLES.EVALUADOR
}

// Quién accede a la SUPERVISIÓN (solo lectura de todo el expediente):
// el Auditor (control y trazabilidad) y el Administrador (responsable de la
// empresa, necesita ver todo lo que pasa: compras, subastas, adjudicaciones).
export function puedeSupervisar(rol) {
  return rol === ROLES.AUDITOR || rol === ROLES.ADMINISTRADOR
}
