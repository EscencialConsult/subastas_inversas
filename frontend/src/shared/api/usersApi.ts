import { ApiError, apiFetch } from './client'
import type { ApiCollection, CambioContrasenaInput, PerfilInput, TenantId, Usuario, UsuarioInput } from '../../domain/entities'

interface BackendUser {
  id?: string
  userId?: string
  firstName?: string
  lastName?: string
  email?: string
  role?: string
  active?: boolean
  mfaEnabled?: boolean
  companyId?: string | null
}

type BackendRole =
  | 'SuperAdmin'
  | 'Admin'
  | 'Comprador'
  | 'Evaluador'
  | 'Autoridad'
  | 'Auditor'
  | 'Proveedor'
  | string

function validarDatos(datos: UsuarioInput) {
  if (!datos.nombre?.trim()) throw new ApiError('El nombre es obligatorio.', 422)
  if (!datos.apellido?.trim()) throw new ApiError('El apellido es obligatorio.', 422)
  if (!datos.email?.trim()) throw new ApiError('El email es obligatorio.', 422)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) {
    throw new ApiError('El email no tiene un formato válido.', 422)
  }
  if (!datos.rol) throw new ApiError('Elegí un rol.', 422)
}

function mapRoleToBackend(frontendRole: string): string {
  const map: Record<string, string> = {
    super_admin: 'SuperAdmin',
    administrador: 'Admin',
    comprador: 'Comprador',
    evaluador: 'Evaluador',
    autoridad: 'Autoridad',
    auditor: 'Auditor',
    proveedor: 'Proveedor',
  }
  return map[frontendRole] || frontendRole
}

function mapRoleToFrontend(backendRole?: BackendRole | null): string {
  const map: Record<string, string> = {
    SuperAdmin: 'super_admin',
    Admin: 'administrador',
    Comprador: 'comprador',
    Evaluador: 'evaluador',
    Autoridad: 'autoridad',
    Auditor: 'auditor',
    Proveedor: 'proveedor',
  }
  return map[backendRole ?? ''] || (backendRole ? backendRole.toLowerCase() : '')
}

function mapBackendUser(data: BackendUser): Usuario {
  return {
    id: data.id ?? '',
    nombre: data.firstName ?? '',
    apellido: data.lastName ?? '',
    email: data.email ?? '',
    rol: mapRoleToFrontend(data.role),
    activo: Boolean(data.active),
    mfaActivo: Boolean(data.mfaEnabled),
    tenantId: data.companyId ?? null,
  }
}

export function listarUsuarios({
  tenantId,
  busqueda = '',
  rol = '',
  soloActivos = null,
}: {
  tenantId: TenantId
  busqueda?: string
  rol?: string
  soloActivos?: boolean | null
}): Promise<Usuario[]> {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())
  if (rol) params.set('role', mapRoleToBackend(rol))
  if (soloActivos !== null) params.set('activeOnly', String(soloActivos))
  const qs = params.toString()
  return apiFetch<BackendUser[] | ApiCollection<BackendUser>>(`/api/companies/${tenantId}/users${qs ? `?${qs}` : ''}`).then(
    (data) => {
      const items = Array.isArray(data) ? data : (data.items ?? [])
      return items.map(mapBackendUser)
    },
  )
}

export function obtenerUsuario({ tenantId, id }: { tenantId: TenantId; id: string }): Promise<Usuario> {
  return apiFetch<BackendUser>(`/api/companies/${tenantId}/users/${id}`).then(mapBackendUser)
}

export function crearUsuario({ tenantId, datos }: { tenantId: TenantId; datos: UsuarioInput }): Promise<Usuario> {
  validarDatos(datos)
  return apiFetch<BackendUser>(`/api/companies/${tenantId}/users`, {
    method: 'POST',
    body: JSON.stringify({
      firstName: datos.nombre.trim(),
      lastName: datos.apellido.trim(),
      email: datos.email.trim(),
      role: mapRoleToBackend(datos.rol),
    }),
  }).then(mapBackendUser)
}

export function actualizarUsuario({ tenantId, id, datos }: { tenantId: TenantId; id: string; datos: UsuarioInput }): Promise<Usuario> {
  validarDatos(datos)
  return apiFetch<BackendUser>(`/api/companies/${tenantId}/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      firstName: datos.nombre.trim(),
      lastName: datos.apellido.trim(),
      email: datos.email.trim(),
      role: mapRoleToBackend(datos.rol),
      active: datos.activo,
    }),
  }).then(mapBackendUser)
}

export function cambiarEstadoUsuario({ tenantId, id, activo }: { tenantId: TenantId; id: string; activo: boolean }): Promise<void> {
  return apiFetch<void>(`/api/companies/${tenantId}/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ active: activo }),
  })
}

export async function nombresPorIds({ tenantId, ids }: { tenantId: TenantId; ids: string[] }): Promise<Record<string, string>> {
  const users = await listarUsuarios({ tenantId })
  const mapa: Record<string, string> = {}
  for (const u of users) {
    if (ids.includes(u.id)) {
      mapa[u.id] = `${u.nombre} ${u.apellido}`.trim()
    }
  }
  return mapa
}

// --- Auto-gestión: el propio usuario edita SUS datos ---
// A diferencia de actualizarUsuario (que usa un admin), acá el usuario no puede
// cambiar su rol ni su estado: solo sus datos personales. Por eso busca por id
// sin pedir tenantId (es su propio registro, salga de donde salga).

export function actualizarPerfil({ id, datos }: { id: string; datos: PerfilInput }): Promise<Usuario> {
  if (!datos.nombre?.trim()) throw new ApiError('El nombre es obligatorio.', 422)
  if (!datos.apellido?.trim()) throw new ApiError('El apellido es obligatorio.', 422)
  if (!datos.email?.trim()) throw new ApiError('El email es obligatorio.', 422)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) {
    throw new ApiError('El email no tiene un formato válido.', 422)
  }

  return apiFetch<BackendUser>('/api/users/profile', {
    method: 'PUT',
    body: JSON.stringify({
      userId: id,
      firstName: datos.nombre.trim(),
      lastName: datos.apellido.trim(),
      email: datos.email.trim(),
    }),
  }).then(mapUserData)
}

function mapUserData(data: BackendUser): Usuario {
  return {
    id: data.userId ?? data.id ?? '',
    nombre: data.firstName ?? '',
    apellido: data.lastName ?? '',
    email: data.email ?? '',
    rol: mapRoleToFrontend(data.role),
    tenantId: data.companyId ?? null,
    mfaActivo: Boolean(data.mfaEnabled),
    activo: true,
  }
}

export function cambiarContrasena({ id, actual, nueva, repetir }: { id: string } & CambioContrasenaInput): Promise<void> {
  if (!actual) throw new ApiError('Ingresá tu contraseña actual.', 422)
  if (!nueva || nueva.length < 6) {
    throw new ApiError('La nueva contraseña debe tener al menos 6 caracteres.', 422)
  }
  if (nueva !== repetir) {
    throw new ApiError('La nueva contraseña y su repetición no coinciden.', 422)
  }

  return apiFetch<void>('/api/users/change-password', {
    method: 'POST',
    body: JSON.stringify({
      userId: id,
      currentPassword: actual,
      newPassword: nueva,
    }),
  })
}
