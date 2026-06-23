import { apiFetch, ApiError } from './client.js'

function mapRole(backendRole) {
  if (backendRole === 'SuperAdmin') return 'super_admin'
  if (backendRole === 'Admin') return 'admin_tenant'
  if (backendRole === 'Comprador') return 'comprador'
  if (backendRole === 'Proveedor') return 'proveedor'
  if (backendRole === 'Evaluador') return 'evaluador'
  if (backendRole === 'Auditor') return 'auditor'
  if (backendRole === 'Autoridad') return 'autoridad'
  return backendRole ? backendRole.toLowerCase() : ''
}

export async function login({ email, password }) {
  if (!email || !password) {
    throw new ApiError('Ingresá email y contraseña.', 422)
  }

  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })

  const usuario = {
    id: data.userId,
    nombre: data.firstName,
    apellido: data.lastName,
    email: data.email,
    rol: mapRole(data.role),
    tenantId: data.companyId,
    activo: true
  }

  const tenant = data.companyId ? {
    id: data.companyId,
    nombre: data.companyName || 'Mi Organización',
    subdominio: 'org'
  } : null

  // We save the token in the session object so client.js can read it
  return { usuario, tenant, token: data.token }
}
