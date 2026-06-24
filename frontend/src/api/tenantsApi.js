// API simulada de tenants.
//
// Los tenants son las empresas/municipios cliente. SOLO el Super Administrador
// (ámbito plataforma) los administra. A diferencia de usuarios, acá NO se filtra
// por tenant: el super-admin los ve todos, porque vive fuera de la pared.

import { simularRed, ApiError } from './client.js'
import { tenants, usuarios, nextId, procesosCompra, subastas } from './mockDb.js'
import { ROLES } from '../domain/roles.js'
import { analisisSubasta } from './subastasApi.js'

export function listarTenants({ busqueda = '', estado = '' } = {}) {
  return simularRed(() => {
    let resultado = [...tenants]

    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      resultado = resultado.filter((t) =>
        `${t.nombre} ${t.subdominio}`.toLowerCase().includes(q),
      )
    }
    if (estado) {
      resultado = resultado.filter((t) => t.activo === (estado === 'activos'))
    }

    // Agregamos cuántos usuarios tiene cada tenant (dato útil para el listado).
    return resultado.map((t) => ({
      ...t,
      cantidadUsuarios: usuarios.filter((u) => u.tenantId === t.id).length,
    }))
  })
}

export function obtenerTenant({ id }) {
  return simularRed(() => {
    const tenant = tenants.find((t) => t.id === id)
    if (!tenant) throw new ApiError('Tenant no encontrado.', 404)
    return { ...tenant }
  })
}

// Detalle completo de una empresa para la supervisión del super-admin:
// sus datos + usuarios + actividad (procesos, subastas, ahorro promedio).
export function obtenerDetalleEmpresa({ id }) {
  return simularRed(() => {
    const tenant = tenants.find((t) => t.id === id)
    if (!tenant) throw new ApiError('Empresa no encontrada.', 404)

    const propios = usuarios.filter((u) => u.tenantId === id)
    const procesos = procesosCompra.filter((p) => p.tenantId === id)
    const subastasEmp = subastas.filter((s) => s.tenantId === id)
    const conLances = subastasEmp.filter((s) => s.lances.length > 0)
    const ahorroProm = conLances.length
      ? Math.round(
          conLances.reduce((acc, s) => acc + analisisSubasta(s).bajaPorcentaje, 0) /
            conLances.length,
        )
      : null

    return {
      tenant: { ...tenant },
      stats: {
        usuarios: propios.length,
        activos: propios.filter((u) => u.activo).length,
        procesos: procesos.length,
        subastas: subastasEmp.length,
        ahorroProm,
      },
      usuarios: propios.map((u) => ({
        id: u.id,
        nombre: u.nombre,
        apellido: u.apellido,
        email: u.email,
        rol: u.rol,
        activo: u.activo,
      })),
    }
  })
}

// Crea el tenant Y su primer Administrador en un solo paso.
// Un tenant sin admin nace inutilizable: nadie podría entrar a configurarlo.
// Validamos TODO antes de crear nada, para no dejar un tenant a medias.
export function crearTenant({ datos, admin }) {
  return simularRed(() => {
    validarDatos(datos)
    validarAdmin(admin)

    const subdominio = normalizarSubdominio(datos.subdominio)
    if (tenants.some((t) => t.subdominio === subdominio)) {
      throw new ApiError('Ya existe un tenant con ese subdominio.', 409)
    }
    const emailAdmin = admin.email.trim()
    if (usuarios.some((u) => u.email.toLowerCase() === emailAdmin.toLowerCase())) {
      throw new ApiError('Ya existe un usuario con el email del administrador.', 409)
    }

    const nuevoTenant = {
      id: nextId('t'),
      nombre: datos.nombre.trim(),
      subdominio,
      activo: datos.activo ?? true,
    }
    tenants.push(nuevoTenant)

    // El admin inicial pertenece al tenant recién creado.
    const nuevoAdmin = {
      id: nextId('u'),
      tenantId: nuevoTenant.id,
      nombre: admin.nombre.trim(),
      apellido: admin.apellido.trim(),
      email: emailAdmin,
      rol: ROLES.ADMINISTRADOR,
      activo: true,
    }
    usuarios.push(nuevoAdmin)

    return { tenant: { ...nuevoTenant }, admin: { ...nuevoAdmin } }
  })
}

export function actualizarTenant({ id, datos }) {
  return simularRed(() => {
    const indice = tenants.findIndex((t) => t.id === id)
    if (indice === -1) throw new ApiError('Tenant no encontrado.', 404)
    validarDatos(datos)
    const subdominio = normalizarSubdominio(datos.subdominio)
    const duplicado = tenants.some((t) => t.id !== id && t.subdominio === subdominio)
    if (duplicado) {
      throw new ApiError('Ya existe otro tenant con ese subdominio.', 409)
    }
    tenants[indice] = {
      ...tenants[indice],
      nombre: datos.nombre.trim(),
      subdominio,
      activo: datos.activo,
    }
    return { ...tenants[indice] }
  })
}

export function cambiarEstadoTenant({ id, activo }) {
  return simularRed(() => {
    const indice = tenants.findIndex((t) => t.id === id)
    if (indice === -1) throw new ApiError('Tenant no encontrado.', 404)
    tenants[indice] = { ...tenants[indice], activo }
    return { ...tenants[indice] }
  })
}

// El subdominio identifica al tenant en la URL (ej: tucuman.sicstmax.com):
// minúsculas, sin espacios, solo letras/números/guiones.
function normalizarSubdominio(valor) {
  return (valor ?? '').trim().toLowerCase()
}

function validarDatos(datos) {
  if (!datos.nombre?.trim()) throw new ApiError('El nombre es obligatorio.', 422)
  const subdominio = normalizarSubdominio(datos.subdominio)
  if (!subdominio) throw new ApiError('El subdominio es obligatorio.', 422)
  if (!/^[a-z0-9-]+$/.test(subdominio)) {
    throw new ApiError(
      'El subdominio solo puede tener minúsculas, números y guiones (sin espacios).',
      422,
    )
  }
}

function validarAdmin(admin) {
  if (!admin?.nombre?.trim()) {
    throw new ApiError('El nombre del administrador es obligatorio.', 422)
  }
  if (!admin?.apellido?.trim()) {
    throw new ApiError('El apellido del administrador es obligatorio.', 422)
  }
  if (!admin?.email?.trim()) {
    throw new ApiError('El email del administrador es obligatorio.', 422)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email.trim())) {
    throw new ApiError('El email del administrador no es válido.', 422)
  }
}
