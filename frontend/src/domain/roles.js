// Modelo de roles de SICST MAX.
//
// IMPORTANTE: tenant != usuario.
//   - Un TENANT es la empresa/municipio cliente (la "pared" que aísla los datos).
//   - Un USUARIO es una persona dentro de un tenant.
//
// Por eso los roles viven en dos niveles:
//   - PLATAFORMA: el dueño del SaaS (tu empresa). Vive FUERA de la pared del tenant.
//   - TENANT: las personas dentro de un municipio/empresa cliente.
//   - EXTERNO: el proveedor, que entra al sistema pero no pertenece al tenant comprador.

export const SCOPE = {
  PLATAFORMA: 'plataforma',
  TENANT: 'tenant',
  EXTERNO: 'externo',
}

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN_TENANT: 'admin_tenant',
  COMPRADOR: 'comprador',
  EVALUADOR: 'evaluador',
  APROBADOR: 'aprobador',
  AUDITOR: 'auditor',
  PROVEEDOR: 'proveedor',
}

// Metadatos de cada rol: etiqueta para mostrar, ámbito y descripción corta.
export const ROLE_INFO = {
  [ROLES.SUPER_ADMIN]: {
    label: 'Super Administrador',
    scope: SCOPE.PLATAFORMA,
    descripcion: 'Gestiona los tenants (municipios/empresas) y planes. No opera compras.',
  },
  [ROLES.ADMIN_TENANT]: {
    label: 'Administrador del tenant',
    scope: SCOPE.TENANT,
    descripcion: 'Configura la organización, da de alta usuarios y asigna roles.',
  },
  [ROLES.COMPRADOR]: {
    label: 'Comprador',
    scope: SCOPE.TENANT,
    descripcion: 'Crea procesos de compra y subastas, carga pliegos.',
  },
  [ROLES.EVALUADOR]: {
    label: 'Evaluador',
    scope: SCOPE.TENANT,
    descripcion: 'Evalúa ofertas y documentación de proveedores.',
  },
  [ROLES.APROBADOR]: {
    label: 'Aprobador / Autoridad',
    scope: SCOPE.TENANT,
    descripcion: 'Autoriza o rechaza en los circuitos de aprobación.',
  },
  [ROLES.AUDITOR]: {
    label: 'Auditor',
    scope: SCOPE.TENANT,
    descripcion: 'Solo lectura: ve expedientes y logs de auditoría.',
  },
  [ROLES.PROVEEDOR]: {
    label: 'Proveedor',
    scope: SCOPE.EXTERNO,
    descripcion: 'Se registra, carga su documentación y participa en subastas.',
  },
}

// Roles que un Administrador de tenant puede asignar a los usuarios de su organización.
// (No puede crear super-admins ni proveedores: el proveedor se auto-registra.)
export const ROLES_ASIGNABLES_POR_TENANT = [
  ROLES.ADMIN_TENANT,
  ROLES.COMPRADOR,
  ROLES.EVALUADOR,
  ROLES.APROBADOR,
  ROLES.AUDITOR,
]

export function etiquetaRol(rol) {
  return ROLE_INFO[rol]?.label ?? rol
}
