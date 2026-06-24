// Modelo de roles de SICST (según el documento oficial de actores y roles).
//
// IMPORTANTE: empresa != usuario.
//   - Una EMPRESA (tenant) es el cliente público o privado (la "pared" que aísla los datos).
//     En el código la identificamos con `tenantId` (equivale a id_empresa del doc).
//   - Un USUARIO es una persona dentro de una empresa.
//
// Los roles viven en tres ámbitos:
//   - PLATAFORMA: Escencial, que opera la plataforma (super-admin).
//   - EMPRESA: el personal del organismo/empresa cliente.
//   - EXTERNO: el proveedor, que no pertenece a ninguna empresa compradora.

export const SCOPE = {
  PLATAFORMA: 'plataforma',
  EMPRESA: 'empresa',
  EXTERNO: 'externo',
}

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMINISTRADOR: 'administrador',
  COMPRADOR: 'comprador',
  EVALUADOR: 'evaluador',
  AUTORIDAD: 'autoridad',
  AUDITOR: 'auditor',
  PROVEEDOR: 'proveedor',
}

// Metadatos de cada rol: etiqueta para mostrar, ámbito y descripción corta.
export const ROLE_INFO = {
  [ROLES.SUPER_ADMIN]: {
    label: 'Super Administrador',
    scope: SCOPE.PLATAFORMA,
    descripcion: 'Opera la plataforma: gestiona las empresas. No opera compras.',
  },
  [ROLES.ADMINISTRADOR]: {
    label: 'Administrador',
    scope: SCOPE.EMPRESA,
    descripcion: 'Administra su empresa: da de alta usuarios, asigna roles y configura.',
  },
  [ROLES.COMPRADOR]: {
    label: 'Comprador',
    scope: SCOPE.EMPRESA,
    descripcion: 'Gestiona los procesos de compra, la subasta y la adjudicación.',
  },
  [ROLES.EVALUADOR]: {
    label: 'Evaluador',
    scope: SCOPE.EMPRESA,
    descripcion: 'Valida la documentación de los proveedores (casos y excepciones).',
  },
  [ROLES.AUTORIDAD]: {
    label: 'Autoridad',
    scope: SCOPE.EMPRESA,
    descripcion: 'Aprueba las adjudicaciones según el monto.',
  },
  [ROLES.AUDITOR]: {
    label: 'Auditor',
    scope: SCOPE.EMPRESA,
    descripcion: 'Solo lectura: control y trazabilidad de todo el expediente.',
  },
  [ROLES.PROVEEDOR]: {
    label: 'Proveedor',
    scope: SCOPE.EXTERNO,
    descripcion: 'Se registra una vez, carga su documentación y oferta en las subastas.',
  },
}

// Roles que un Administrador puede asignar al personal de su empresa.
// (No puede crear super-admins ni proveedores: el proveedor se auto-registra.)
export const ROLES_ASIGNABLES_POR_EMPRESA = [
  ROLES.ADMINISTRADOR,
  ROLES.COMPRADOR,
  ROLES.EVALUADOR,
  ROLES.AUTORIDAD,
  ROLES.AUDITOR,
]

export function etiquetaRol(rol) {
  return ROLE_INFO[rol]?.label ?? rol
}
