// Contexto de sesión: mantiene quién está logueado y en qué tenant.
//
// La sesión es la fuente de verdad de "en qué tenant estoy" y "qué rol tengo".
// De acá salen el menú y los permisos visuales de toda la app.

import { useEffect, useMemo, useState } from 'react'
import { login as loginApi } from '../api/authApi.js'
import { AuthContext } from './authContextValue.js'

const CLAVE_STORAGE = 'sicst.sesion'

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

  async function login(credenciales) {
    setCargando(true)
    try {
      const { usuario, tenant, token } = await loginApi(credenciales)
      setSesion({ usuario, tenant, token })
      return usuario
    } finally {
      setCargando(false)
    }
  }

  function logout() {
    setSesion(null)
  }

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
      logout,
      actualizarUsuarioSesion,
    }),
    [sesion, cargando],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

function leerSesionGuardada() {
  try {
    const crudo = localStorage.getItem(CLAVE_STORAGE)
    return crudo ? JSON.parse(crudo) : null
  } catch {
    return null
  }
}
