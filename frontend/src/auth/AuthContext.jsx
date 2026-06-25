// Contexto de sesión: mantiene quién está logueado y en qué tenant.
//
// La sesión es la fuente de verdad de "en qué tenant estoy" y "qué rol tengo".
// De acá salen el menú y los permisos visuales de toda la app.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { login as loginApi, logoutApi, verificarMfa as verificarMfaApi } from '../api/authApi.js'

const CLAVE_STORAGE = 'sicst.sesion'
const COLOR_PRIMARIO_DEFAULT = '#1d4ed8'
const COLOR_PRIMARIO_HOVER_DEFAULT = '#1742b8'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(() => leerSesionGuardada())
  const [cargando, setCargando] = useState(false)

  // Persistimos la sesión para que un refresh no te eche.
  useEffect(() => {
    if (sesion) {
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(sesion))
    } else {
      localStorage.removeItem(CLAVE_STORAGE)
    }
  }, [sesion])

  useEffect(() => {
    aplicarBranding(sesion?.tenant?.colorPrimario)
  }, [sesion?.tenant?.colorPrimario])

  const login = useCallback(async (credenciales) => {
    setCargando(true)
    try {
      const respuesta = await loginApi(credenciales)
      if (respuesta.requiereMfa) {
        return respuesta
      }

      const { usuario, tenant, token, refreshToken } = respuesta
      setSesion({ usuario, tenant, token, refreshToken })
      return { usuario }
    } finally {
      setCargando(false)
    }
  }, [])

  const verificarMfa = useCallback(async (datos) => {
    setCargando(true)
    try {
      const { usuario, tenant, token, refreshToken } = await verificarMfaApi(datos)
      setSesion({ usuario, tenant, token, refreshToken })
      return usuario
    } finally {
      setCargando(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      if (sesion?.token) {
        await logoutApi()
      }
    } catch {
      // Si el servidor no responde, igual cerramos la sesion local.
    }
    setSesion(null)
  }, [sesion])

  // Refresca los datos del usuario logueado (ej: después de editar su perfil),
  // para que el header y demás muestren los datos nuevos sin volver a loguear.
  function actualizarUsuarioSesion(usuario) {
    setSesion((prev) => (prev ? { ...prev, usuario } : prev))
  }

  const valor = useMemo(
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

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

function leerSesionGuardada() {
  try {
    const crudo = localStorage.getItem(CLAVE_STORAGE)
    return crudo ? JSON.parse(crudo) : null
  } catch {
    return null
  }
}

function aplicarBranding(colorPrimario) {
  const color = esHexColor(colorPrimario) ? colorPrimario : COLOR_PRIMARIO_DEFAULT
  document.documentElement.style.setProperty('--color-primario', color)
  document.documentElement.style.setProperty(
    '--color-primario-hover',
    esHexColor(colorPrimario) ? oscurecerHex(colorPrimario, 0.12) : COLOR_PRIMARIO_HOVER_DEFAULT,
  )
}

function esHexColor(valor) {
  return typeof valor === 'string' && /^#[0-9a-fA-F]{6}$/.test(valor)
}

function oscurecerHex(hex, factor) {
  const limpio = hex.replace('#', '')
  const canales = [0, 2, 4].map((inicio) => parseInt(limpio.slice(inicio, inicio + 2), 16))
  const oscuro = canales.map((canal) =>
    Math.max(0, Math.min(255, Math.round(canal * (1 - factor))))
      .toString(16)
      .padStart(2, '0'),
  )
  return `#${oscuro.join('')}`
}
