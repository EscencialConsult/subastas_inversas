import { apiFetch, ApiError } from './client'
import type { RolType } from '../domain/roles'

export interface UsuarioSesion {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: RolType | string
  tenantId: string | null
  activo: boolean
  mfaActivo: boolean
}

export interface TenantSesion {
  id: string
  nombre: string
  subdominio: string
  logo: string
  colorPrimario: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface MfaInput {
  mfaToken: string
  code: string
}

export interface AuthSuccess {
  usuario: UsuarioSesion
  tenant: TenantSesion | null
  token: string
}

export interface MfaRequired {
  requiereMfa: true
  mfaToken: string
  usuarioPendiente: {
    email: string
    nombre: string
    apellido: string
  }
}

type AuthResult = AuthSuccess | MfaRequired

interface BackendAuthResponse {
  token?: string
  userId: string
  email: string
  firstName: string
  lastName: string
  role: string
  companyId?: string | null
  companyName?: string | null
  companyLogo?: string | null
  companyPrimaryColor?: string | null
  requiresMfa?: boolean
  mfaEnabled?: boolean
  mfaToken?: string
}

function mapRole(backendRole: string): RolType | string {
  if (backendRole === 'SuperAdmin') return 'super_admin'
  if (backendRole === 'Admin') return 'administrador'
  if (backendRole === 'Comprador') return 'comprador'
  if (backendRole === 'Proveedor') return 'proveedor'
  if (backendRole === 'Evaluador') return 'evaluador'
  if (backendRole === 'Auditor') return 'auditor'
  if (backendRole === 'Autoridad') return 'autoridad'
  return backendRole ? backendRole.toLowerCase() : ''
}

export async function login({ email, password }: LoginInput): Promise<AuthResult> {
  if (!email || !password) {
    throw new ApiError('Ingresa email y contrasena.', 422)
  }

  const data = await apiFetch<BackendAuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  })

  return mapAuthResponse(data)
}

export async function verificarMfa({ mfaToken, code }: MfaInput): Promise<AuthResult> {
  if (!mfaToken || !code) {
    throw new ApiError('Ingresa el codigo MFA.', 422)
  }

  const data = await apiFetch<BackendAuthResponse>('/api/auth/mfa/verify', {
    method: 'POST',
    body: { mfaToken, code },
  })

  return mapAuthResponse(data)
}

export function prepararMfa() {
  return apiFetch('/api/auth/mfa/setup', { method: 'POST' })
}

export function activarMfa({ code }: { code: string }) {
  return apiFetch('/api/auth/mfa/enable', {
    method: 'POST',
    body: { code },
  })
}

export function desactivarMfa({ code }: { code: string }) {
  return apiFetch('/api/auth/mfa/disable', {
    method: 'POST',
    body: { code },
  })
}

export function logoutApi() {
  return apiFetch('/api/auth/logout', { method: 'POST' })
}

function mapAuthResponse(data: BackendAuthResponse): AuthResult {
  if (data.requiresMfa) {
    return {
      requiereMfa: true,
      mfaToken: data.mfaToken ?? '',
      usuarioPendiente: {
        email: data.email,
        nombre: data.firstName,
        apellido: data.lastName,
      },
    }
  }

  const usuario: UsuarioSesion = {
    id: data.userId,
    nombre: data.firstName,
    apellido: data.lastName,
    email: data.email,
    rol: mapRole(data.role),
    tenantId: data.companyId ?? null,
    activo: true,
    mfaActivo: Boolean(data.mfaEnabled),
  }

  const tenant: TenantSesion | null = data.companyId
    ? {
        id: data.companyId,
        nombre: data.companyName || 'Mi Organizacion',
        subdominio: 'org',
        logo: data.companyLogo ?? '',
        colorPrimario: data.companyPrimaryColor ?? '',
      }
    : null

  return {
    usuario,
    tenant,
    token: data.token ?? '',
  }
}

export async function resetPassword({ userId, newPassword }: { userId: string; newPassword: string }) {
  return apiFetch('/api/auth/reset-password', {
    method: 'POST',
    body: { userId, newPassword },
  })
}
