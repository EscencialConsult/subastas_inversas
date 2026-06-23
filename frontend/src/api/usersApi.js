import { ApiError, apiFetch } from './client.js'

function validarDatos(datos) {
  if (!datos.nombre?.trim()) throw new ApiError('El nombre es obligatorio.', 422)
  if (!datos.apellido?.trim()) throw new ApiError('El apellido es obligatorio.', 422)
  if (!datos.email?.trim()) throw new ApiError('El email es obligatorio.', 422)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) {
    throw new ApiError('El email no tiene un formato válido.', 422)
  }
  if (!datos.rol) throw new ApiError('Elegí un rol.', 422)
}

function mapRoleToBackend(frontendRole) {
  const map = {
    super_admin: 'SuperAdmin',
    admin_tenant: 'Admin',
    comprador: 'Comprador',
    evaluador: 'Evaluador',
    aprobador: 'Autoridad',
    auditor: 'Auditor',
    proveedor: 'Proveedor',
  }
  return map[frontendRole] || frontendRole
}

function mapRoleToFrontend(backendRole) {
  const map = {
    SuperAdmin: 'super_admin',
    Admin: 'admin_tenant',
    Comprador: 'comprador',
    Evaluador: 'evaluador',
    Autoridad: 'aprobador',
    Auditor: 'auditor',
    Proveedor: 'proveedor',
  }
  return map[backendRole] || (backendRole ? backendRole.toLowerCase() : '')
}

function mapBackendUser(data) {
  return {
    id: data.id,
    nombre: data.firstName,
    apellido: data.lastName,
    email: data.email,
    rol: mapRoleToFrontend(data.role),
    activo: data.active,
    tenantId: data.companyId,
  }
}

export function listarUsuarios({ tenantId, busqueda = '', rol = '', soloActivos = null }) {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())
  if (rol) params.set('role', mapRoleToBackend(rol))
  if (soloActivos !== null) params.set('activeOnly', soloActivos)
  const qs = params.toString()
  return apiFetch(`/api/companies/${tenantId}/users${qs ? `?${qs}` : ''}`).then(
    (data) => {
      const items = Array.isArray(data) ? data : (data.items ?? [])
      return items.map(mapBackendUser)
    },
  )
}

export function obtenerUsuario({ tenantId, id }) {
  return apiFetch(`/api/companies/${tenantId}/users/${id}`).then(mapBackendUser)
}

export function crearUsuario({ tenantId, datos }) {
  validarDatos(datos)
  return apiFetch(`/api/companies/${tenantId}/users`, {
    method: 'POST',
    body: JSON.stringify({
      firstName: datos.nombre.trim(),
      lastName: datos.apellido.trim(),
      email: datos.email.trim(),
      role: mapRoleToBackend(datos.rol),
    }),
  }).then(mapBackendUser)
}

export function actualizarUsuario({ tenantId, id, datos }) {
  validarDatos(datos)
  return apiFetch(`/api/companies/${tenantId}/users/${id}`, {
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

export function cambiarEstadoUsuario({ tenantId, id, activo }) {
  return apiFetch(`/api/companies/${tenantId}/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ active: activo }),
  })
}

export async function nombresPorIds({ tenantId, ids }) {
  const users = await listarUsuarios({ tenantId })
  const mapa = {}
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

export function actualizarPerfil({ id, datos }) {
  if (!datos.nombre?.trim()) throw new ApiError('El nombre es obligatorio.', 422)
  if (!datos.apellido?.trim()) throw new ApiError('El apellido es obligatorio.', 422)
  if (!datos.email?.trim()) throw new ApiError('El email es obligatorio.', 422)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) {
    throw new ApiError('El email no tiene un formato válido.', 422)
  }

  return apiFetch('/api/users/profile', {
    method: 'PUT',
    body: JSON.stringify({
      userId: id,
      firstName: datos.nombre.trim(),
      lastName: datos.apellido.trim(),
      email: datos.email.trim(),
    }),
  }).then(mapUserData)
}

function mapUserData(data) {
  return {
    id: data.userId,
    nombre: data.firstName,
    apellido: data.lastName,
    email: data.email,
    rol: mapRoleToFrontend(data.role),
    tenantId: data.companyId,
    activo: true,
  }
}

export function cambiarContrasena({ id, actual, nueva, repetir }) {
  if (!actual) throw new ApiError('Ingresá tu contraseña actual.', 422)
  if (!nueva || nueva.length < 6) {
    throw new ApiError('La nueva contraseña debe tener al menos 6 caracteres.', 422)
  }
  if (nueva !== repetir) {
    throw new ApiError('La nueva contraseña y su repetición no coinciden.', 422)
  }

  return apiFetch('/api/users/change-password', {
    method: 'POST',
    body: JSON.stringify({
      userId: id,
      currentPassword: actual,
      newPassword: nueva,
    }),
  })
}
