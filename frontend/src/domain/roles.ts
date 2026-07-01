// Modelo de roles de SICST.

export const SCOPE = {
  PLATAFORMA: 'plataforma',
  EMPRESA: 'empresa',
  EXTERNO: 'externo',
} as const

export type ScopeType = (typeof SCOPE)[keyof typeof SCOPE]

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMINISTRADOR: 'administrador',
  COMPRADOR: 'comprador',
  EVALUADOR: 'evaluador',
  AUTORIDAD: 'autoridad',
  AUDITOR: 'auditor',
  PROVEEDOR: 'proveedor',
} as const

export type RolType = (typeof ROLES)[keyof typeof ROLES]

interface RoleMeta {
  label: string
  scope: ScopeType
  descripcion: string
}

export const ROLE_INFO: Record<RolType, RoleMeta> = {
  super_admin: {
    label: 'Super Administrador',
    scope: SCOPE.PLATAFORMA,
    descripcion: 'Opera la plataforma: gestiona las empresas. No opera compras.',
  },
  administrador: {
    label: 'Administrador',
    scope: SCOPE.EMPRESA,
    descripcion: 'Administra su empresa: da de alta usuarios, asigna roles y configura.',
  },
  comprador: {
    label: 'Comprador',
    scope: SCOPE.EMPRESA,
    descripcion: 'Gestiona los procesos de compra, la subasta y la adjudicacion.',
  },
  evaluador: {
    label: 'Evaluador',
    scope: SCOPE.EMPRESA,
    descripcion: 'Valida la documentacion de los proveedores.',
  },
  autoridad: {
    label: 'Autoridad',
    scope: SCOPE.EMPRESA,
    descripcion: 'Aprueba las adjudicaciones segun el monto.',
  },
  auditor: {
    label: 'Auditor',
    scope: SCOPE.EMPRESA,
    descripcion: 'Solo lectura: control y trazabilidad de todo el expediente.',
  },
  proveedor: {
    label: 'Proveedor',
    scope: SCOPE.EXTERNO,
    descripcion: 'Se registra una vez, carga su documentacion y oferta en las subastas.',
  },
}

export const ROLES_ASIGNABLES_POR_EMPRESA: RolType[] = [
  ROLES.ADMINISTRADOR,
  ROLES.COMPRADOR,
  ROLES.EVALUADOR,
  ROLES.AUTORIDAD,
  ROLES.AUDITOR,
]

export function etiquetaRol(rol: RolType | string): string {
  return ROLE_INFO[rol as RolType]?.label ?? rol
}
