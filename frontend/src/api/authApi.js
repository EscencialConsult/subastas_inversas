// API simulada de autenticación.
//
// En el login real, el backend valida usuario+contraseña DENTRO del tenant
// (identificado por el subdominio) y devuelve la sesión. Acá lo simulamos.

import { simularRed, ApiError } from './client.js'
import { usuarios, tenants } from './mockDb.js'

// Para el mock, cualquier contraseña no vacía es válida.
export function login({ email, password }) {
  return simularRed(() => {
    if (!email || !password) {
      throw new ApiError('Ingresá email y contraseña.', 422)
    }
    const usuario = usuarios.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (!usuario) {
      throw new ApiError('Email o contraseña incorrectos.', 401)
    }
    if (!usuario.activo) {
      throw new ApiError('Tu usuario está desactivado. Contactá al administrador.', 403)
    }
    const tenant = tenants.find((t) => t.id === usuario.tenantId) ?? null
    return { usuario, tenant }
  })
}
