import { resetPassword } from '../../../shared/api/authApi'
import {
  actualizarUsuario,
  cambiarEstadoUsuario,
  crearUsuario,
  listarUsuarios,
  obtenerUsuario,
} from '../../../shared/api/usersApi'
import type { TenantId, UsuarioInput } from '../../../domain/entities'

export interface UsuariosListParams {
  tenantId?: TenantId | null
  busqueda?: string
  rol?: string
  soloActivos?: boolean | null
}

export const usuariosKeys = {
  all: ['usuarios'] as const,
  lists: () => [...usuariosKeys.all, 'list'] as const,
  list: (params: UsuariosListParams) => [...usuariosKeys.lists(), params] as const,
  detail: (tenantId?: TenantId | null, id?: string | null) => [...usuariosKeys.all, 'detail', tenantId ?? '', id ?? ''] as const,
}

export function listarUsuariosQuery(params: UsuariosListParams) {
  return listarUsuarios({
    tenantId: params.tenantId ?? '',
    busqueda: params.busqueda ?? '',
    rol: params.rol ?? '',
    soloActivos: params.soloActivos ?? null,
  })
}

export function obtenerUsuarioQuery(params: { tenantId?: TenantId | null; id?: string | null }) {
  return obtenerUsuario({ tenantId: params.tenantId ?? '', id: params.id ?? '' })
}

export function crearUsuarioMutation(params: { tenantId: TenantId; datos: UsuarioInput }) {
  return crearUsuario(params)
}

export function actualizarUsuarioMutation(params: { tenantId: TenantId; id: string; datos: UsuarioInput }) {
  return actualizarUsuario(params)
}

export function cambiarEstadoUsuarioMutation(params: { tenantId: TenantId; id: string; activo: boolean }) {
  return cambiarEstadoUsuario(params)
}

export function resetPasswordUsuarioMutation(params: { userId: string; newPassword: string }) {
  return resetPassword(params)
}
