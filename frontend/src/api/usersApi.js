// API simulada de usuarios.
//
// Regla de oro del sistema: NUNCA devolver datos de otro tenant.
// Por eso toda función recibe `tenantId` y filtra por él antes de devolver nada.
// El super-admin (plataforma) es el único que puede consultar sin tenant.

import { simularRed, ApiError } from './client.js'
import { usuarios, nextId } from './mockDb.js'

function filtrarPorTenant(lista, tenantId) {
  // tenantId null = plataforma (super-admin): ve usuarios de plataforma.
  return lista.filter((u) => u.tenantId === tenantId)
}

export function listarUsuarios({ tenantId, busqueda = '', rol = '', soloActivos = null }) {
  return simularRed(() => {
    let resultado = filtrarPorTenant(usuarios, tenantId)

    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      resultado = resultado.filter((u) =>
        `${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(q),
      )
    }
    if (rol) {
      resultado = resultado.filter((u) => u.rol === rol)
    }
    if (soloActivos !== null) {
      resultado = resultado.filter((u) => u.activo === soloActivos)
    }
    // Copia para que las pantallas no muten el "store" por accidente.
    return resultado.map((u) => ({ ...u }))
  })
}

export function obtenerUsuario({ tenantId, id }) {
  return simularRed(() => {
    const usuario = usuarios.find((u) => u.id === id && u.tenantId === tenantId)
    if (!usuario) {
      throw new ApiError('Usuario no encontrado.', 404)
    }
    return { ...usuario }
  })
}

export function crearUsuario({ tenantId, datos }) {
  return simularRed(() => {
    validarDatos(datos)
    if (usuarios.some((u) => u.email.toLowerCase() === datos.email.toLowerCase())) {
      throw new ApiError('Ya existe un usuario con ese email.', 409)
    }
    const nuevo = {
      id: nextId(),
      tenantId, // el backend lo forzaría server-side; acá lo dejamos explícito
      nombre: datos.nombre.trim(),
      apellido: datos.apellido.trim(),
      email: datos.email.trim(),
      rol: datos.rol,
      activo: datos.activo ?? true,
    }
    usuarios.push(nuevo)
    return { ...nuevo }
  })
}

export function actualizarUsuario({ tenantId, id, datos }) {
  return simularRed(() => {
    const indice = usuarios.findIndex((u) => u.id === id && u.tenantId === tenantId)
    if (indice === -1) {
      throw new ApiError('Usuario no encontrado.', 404)
    }
    validarDatos(datos)
    const emailDuplicado = usuarios.some(
      (u) => u.id !== id && u.email.toLowerCase() === datos.email.toLowerCase(),
    )
    if (emailDuplicado) {
      throw new ApiError('Ya existe otro usuario con ese email.', 409)
    }
    usuarios[indice] = {
      ...usuarios[indice],
      nombre: datos.nombre.trim(),
      apellido: datos.apellido.trim(),
      email: datos.email.trim(),
      rol: datos.rol,
      activo: datos.activo,
    }
    return { ...usuarios[indice] }
  })
}

export function cambiarEstadoUsuario({ tenantId, id, activo }) {
  return simularRed(() => {
    const indice = usuarios.findIndex((u) => u.id === id && u.tenantId === tenantId)
    if (indice === -1) {
      throw new ApiError('Usuario no encontrado.', 404)
    }
    usuarios[indice] = { ...usuarios[indice], activo }
    return { ...usuarios[indice] }
  })
}

function validarDatos(datos) {
  if (!datos.nombre?.trim()) throw new ApiError('El nombre es obligatorio.', 422)
  if (!datos.apellido?.trim()) throw new ApiError('El apellido es obligatorio.', 422)
  if (!datos.email?.trim()) throw new ApiError('El email es obligatorio.', 422)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) {
    throw new ApiError('El email no tiene un formato válido.', 422)
  }
  if (!datos.rol) throw new ApiError('Elegí un rol.', 422)
}

// Resuelve nombres a partir de ids de usuario. Útil para mostrar "quién hizo qué"
// en el expediente de auditoría. Devuelve un mapa { id: "Nombre Apellido" }.
export function nombresPorIds({ ids }) {
  return simularRed(() => {
    const mapa = {}
    for (const id of ids.filter(Boolean)) {
      const u = usuarios.find((x) => x.id === id)
      if (u) mapa[id] = `${u.nombre} ${u.apellido}`.trim()
    }
    return mapa
  })
}

// --- Auto-gestión: el propio usuario edita SUS datos ---
// A diferencia de actualizarUsuario (que usa un admin), acá el usuario no puede
// cambiar su rol ni su estado: solo sus datos personales. Por eso busca por id
// sin pedir tenantId (es su propio registro, salga de donde salga).

export function actualizarPerfil({ id, datos }) {
  return simularRed(() => {
    const indice = usuarios.findIndex((u) => u.id === id)
    if (indice === -1) throw new ApiError('Usuario no encontrado.', 404)
    if (!datos.nombre?.trim()) throw new ApiError('El nombre es obligatorio.', 422)
    if (!datos.apellido?.trim()) throw new ApiError('El apellido es obligatorio.', 422)
    if (!datos.email?.trim()) throw new ApiError('El email es obligatorio.', 422)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) {
      throw new ApiError('El email no tiene un formato válido.', 422)
    }
    const emailDuplicado = usuarios.some(
      (u) => u.id !== id && u.email.toLowerCase() === datos.email.trim().toLowerCase(),
    )
    if (emailDuplicado) throw new ApiError('Ya existe otro usuario con ese email.', 409)

    usuarios[indice] = {
      ...usuarios[indice],
      nombre: datos.nombre.trim(),
      apellido: datos.apellido.trim(),
      email: datos.email.trim(),
    }
    return { ...usuarios[indice] }
  })
}

export function cambiarContrasena({ id, actual, nueva, repetir }) {
  return simularRed(() => {
    const usuario = usuarios.find((u) => u.id === id)
    if (!usuario) throw new ApiError('Usuario no encontrado.', 404)
    if (!actual) throw new ApiError('Ingresá tu contraseña actual.', 422)
    if (!nueva || nueva.length < 6) {
      throw new ApiError('La nueva contraseña debe tener al menos 6 caracteres.', 422)
    }
    if (nueva !== repetir) {
      throw new ApiError('La nueva contraseña y su repetición no coinciden.', 422)
    }
    // OJO: el mock todavía no guarda contraseñas, así que no se valida `actual`
    // contra nada. Cuando exista el backend, ahí se verifica la contraseña real.
    return { ok: true }
  })
}
