import {
  actualizarTenant,
  cambiarEstadoTenant,
  crearTenant,
  listarTenants,
  obtenerDetalleEmpresa,
  obtenerTenant,
  type TenantAdminInput,
  type TenantInput,
} from '../../../shared/api/tenantsApi'

export interface TenantsListParams {
  busqueda?: string
  estado?: string
}

export const tenantsKeys = {
  all: ['tenants'] as const,
  lists: () => [...tenantsKeys.all, 'list'] as const,
  list: (params: TenantsListParams) => [...tenantsKeys.lists(), params] as const,
  detail: (id?: string | null) => [...tenantsKeys.all, 'detail', id ?? ''] as const,
  companyDetail: (id?: string | null) => [...tenantsKeys.all, 'company-detail', id ?? ''] as const,
}

export function listarTenantsQuery(params: TenantsListParams) {
  return listarTenants(params)
}

export function obtenerTenantQuery(params: { id?: string | null }) {
  return obtenerTenant({ id: params.id ?? '' })
}

export function obtenerDetalleEmpresaQuery(params: { id?: string | null }) {
  return obtenerDetalleEmpresa({ id: params.id ?? '' })
}

export function crearTenantMutation(params: { datos: TenantInput; admin: TenantAdminInput }) {
  return crearTenant(params)
}

export function actualizarTenantMutation(params: { id: string; datos: TenantInput }) {
  return actualizarTenant(params)
}

export function cambiarEstadoTenantMutation(params: { id: string; activo: boolean }) {
  return cambiarEstadoTenant(params)
}
