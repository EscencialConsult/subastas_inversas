// Contexto de sesion: mantiene quien esta logueado y en que tenant.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  login as loginApi,
  logoutApi,
  verificarMfa as verificarMfaApi,
  type AuthSuccess,
  type LoginInput,
  type MfaInput,
  type TenantSesion,
  type UsuarioSesion,
} from '../shared/api/authApi'
import { clearAccessToken, setAccessToken } from '../shared/api/client'
import type { RolType } from '../domain/roles'

const CLAVE_STORAGE_LEGACY = 'sicst.sesion'
const COLOR_PRIMARIO_DEFAULT = '#1d4ed8'
const COLOR_PRIMARIO_HOVER_DEFAULT = '#1742b8'

interface Sesion {
  usuario: UsuarioSesion
  tenant: TenantSesion | null
}

interface AuthContextValue {
  sesion: Sesion | null
  usuario: UsuarioSesion | null
  tenant: TenantSesion | null
  tenantId: string | null
  rol: RolType | string | null
  estaAutenticado: boolean
  cargando: boolean
  login: (credenciales: LoginInput) => Promise<{ usuario: UsuarioSesion } | Awaited<ReturnType<typeof loginApi>>>
  verificarMfa: (datos: MfaInput) => Promise<UsuarioSesion | Awaited<ReturnType<typeof verificarMfaApi>>>
  logout: () => Promise<void>
  actualizarUsuarioSesion: (usuario: UsuarioSesion) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    localStorage.removeItem(CLAVE_STORAGE_LEGACY)
  }, [])

  useEffect(() => {
    aplicarBranding(sesion?.tenant?.colorPrimario)
  }, [sesion?.tenant?.colorPrimario])

  const login = useCallback(async (credenciales: LoginInput) => {
    setCargando(true)
    try {
      const respuesta = await loginApi(credenciales)
      if ('requiereMfa' in respuesta) {
        return respuesta
      }

      aplicarSesionAutenticada(respuesta)
      return { usuario: respuesta.usuario }
    } finally {
      setCargando(false)
    }
  }, [])

  const verificarMfa = useCallback(async (datos: MfaInput) => {
    setCargando(true)
    try {
      const respuesta = await verificarMfaApi(datos)
      if ('requiereMfa' in respuesta) {
        return respuesta
      }

      aplicarSesionAutenticada(respuesta)
      return respuesta.usuario
    } finally {
      setCargando(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      if (sesion) {
        await logoutApi()
      }
    } catch {
      // Si el servidor no responde, igual cerramos la sesion local.
    }
    clearAccessToken()
    setSesion(null)
  }, [sesion])

  function aplicarSesionAutenticada(respuesta: AuthSuccess) {
    setAccessToken(respuesta.token)
    setSesion({ usuario: respuesta.usuario, tenant: respuesta.tenant })
  }

  function actualizarUsuarioSesion(usuario: UsuarioSesion) {
    setSesion((prev) => (prev ? { ...prev, usuario } : prev))
  }

  const valor = useMemo<AuthContextValue>(
    () => ({
      sesion,
      usuario: sesion?.usuario ?? null,
      tenant: sesion?.tenant ?? null,
      tenantId: sesion?.usuario?.tenantId ?? null,
      rol: sesion?.usuario?.rol ?? null,
      estaAutenticado: Boolean(sesion),
      cargando,
      login,
      verificarMfa,
      logout,
      actualizarUsuarioSesion,
    }),
    [sesion, cargando, login, verificarMfa, logout],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

function aplicarBranding(colorPrimario?: string) {
  const color = esHexColor(colorPrimario) ? colorPrimario : COLOR_PRIMARIO_DEFAULT
  document.documentElement.style.setProperty('--color-primario', color)
  document.documentElement.style.setProperty(
    '--color-primario-hover',
    esHexColor(colorPrimario) ? oscurecerHex(colorPrimario, 0.12) : COLOR_PRIMARIO_HOVER_DEFAULT,
  )
}

function esHexColor(valor: unknown): valor is string {
  return typeof valor === 'string' && /^#[0-9a-fA-F]{6}$/.test(valor)
}

function oscurecerHex(hex: string, factor: number) {
  const limpio = hex.replace('#', '')
  const canales = [0, 2, 4].map((inicio) => parseInt(limpio.slice(inicio, inicio + 2), 16))
  const oscuro = canales.map((canal) =>
    Math.max(0, Math.min(255, Math.round(canal * (1 - factor))))
      .toString(16)
      .padStart(2, '0'),
  )
  return `#${oscuro.join('')}`
}
