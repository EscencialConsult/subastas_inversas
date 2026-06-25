import { apiFetch, ApiError } from './client.js'

function mapRole(backendRole) {
  if (backendRole === 'SuperAdmin') return 'super_admin'
  if (backendRole === 'Admin') return 'administrador'
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

  return mapAuthResponse(data)
}

export async function verificarMfa({ mfaToken, code }) {
  if (!mfaToken || !code) {
    throw new ApiError('Ingresa el codigo MFA.', 422)
  }

  const data = await apiFetch('/api/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ mfaToken, code })
  })

  return mapAuthResponse(data)
}

export function prepararMfa() {
  return apiFetch('/api/auth/mfa/setup', { method: 'POST' })
}

export function activarMfa({ code }) {
  return apiFetch('/api/auth/mfa/enable', {
    method: 'POST',
    body: JSON.stringify({ code })
  })
}

export function desactivarMfa({ code }) {
  return apiFetch('/api/auth/mfa/disable', {
    method: 'POST',
    body: JSON.stringify({ code })
  })
}

export function logoutApi() {
  return apiFetch('/api/auth/logout', { method: 'POST' })
}

function mapAuthResponse(data) {
  if (data.requiresMfa) {
    return {
      requiereMfa: true,
      mfaToken: data.mfaToken,
      usuarioPendiente: {
        email: data.email,
        nombre: data.firstName,
        apellido: data.lastName
      }
    }
  }

  const usuario = {
    id: data.userId,
    nombre: data.firstName,
    apellido: data.lastName,
    email: data.email,
    rol: mapRole(data.role),
    tenantId: data.companyId,
    activo: true,
    mfaActivo: data.mfaEnabled
  }

  const tenant = data.companyId ? {
    id: data.companyId,
    nombre: data.companyName || 'Mi Organización',
    subdominio: 'org',
    logo: data.companyLogo ?? '',
    colorPrimario: data.companyPrimaryColor ?? ''
  } : null

  // We save the token in the session object so client.js can read it
  return {
    usuario,
    tenant,
    token: data.token,
    refreshToken: data.refreshToken
  }
}

export async function resetPassword({ userId, newPassword }) {
  return apiFetch('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ userId, newPassword }),
  })
}
