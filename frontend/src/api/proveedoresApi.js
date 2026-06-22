// API simulada de proveedores.
//
// El proveedor es el ÚNICO usuario que se da de alta solo (auto-registro).
// Registrarse crea DOS cosas a la vez: el usuario (rol PROVEEDOR) y su perfil
// de empresa (razón social, CUIT), que arranca 'pendiente' de verificación.

import { simularRed, ApiError } from './client.js'
import { usuarios, proveedores, nextId } from './mockDb.js'
import { ROLES } from '../domain/roles.js'

export function registrarProveedor({ datos }) {
  return simularRed(() => {
    validar(datos)

    const email = datos.email.trim()
    if (usuarios.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new ApiError('Ya existe una cuenta con ese email.', 409)
    }
    const cuit = datos.cuit.trim()
    if (proveedores.some((p) => p.cuit === cuit)) {
      throw new ApiError('Ya hay un proveedor registrado con ese CUIT.', 409)
    }

    // 1) El usuario externo (no pertenece a ningún tenant).
    const usuario = {
      id: nextId('u'),
      tenantId: null,
      nombre: datos.razonSocial.trim(),
      apellido: '',
      email,
      rol: ROLES.PROVEEDOR,
      activo: true,
    }
    usuarios.push(usuario)

    // 2) El perfil de empresa, pendiente de verificación.
    const proveedor = {
      id: nextId('p'),
      usuarioId: usuario.id,
      razonSocial: datos.razonSocial.trim(),
      cuit,
      estado: 'pendiente',
    }
    proveedores.push(proveedor)

    return { usuario: { ...usuario }, proveedor: { ...proveedor } }
  })
}

export function obtenerProveedorDeUsuario({ usuarioId }) {
  return simularRed(() => {
    const proveedor = proveedores.find((p) => p.usuarioId === usuarioId)
    if (!proveedor) throw new ApiError('Perfil de proveedor no encontrado.', 404)
    return { ...proveedor }
  })
}

function validar(datos) {
  if (!datos.razonSocial?.trim()) {
    throw new ApiError('La razón social es obligatoria.', 422)
  }
  if (!datos.cuit?.trim()) throw new ApiError('El CUIT es obligatorio.', 422)
  // CUIT: 11 dígitos, con o sin guiones (ej: 30-12345678-9 o 30123456789).
  if (!/^\d{2}-?\d{8}-?\d$/.test(datos.cuit.trim())) {
    throw new ApiError('El CUIT no tiene un formato válido (ej: 30-12345678-9).', 422)
  }
  if (!datos.email?.trim()) throw new ApiError('El email es obligatorio.', 422)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) {
    throw new ApiError('El email no tiene un formato válido.', 422)
  }
  if (!datos.password || datos.password.length < 6) {
    throw new ApiError('La contraseña debe tener al menos 6 caracteres.', 422)
  }
  if (datos.password !== datos.repetir) {
    throw new ApiError('La contraseña y su repetición no coinciden.', 422)
  }
}
