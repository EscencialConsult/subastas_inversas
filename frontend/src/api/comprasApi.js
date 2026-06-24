// API simulada de procesos de compra (alineada al documento oficial).
//
// Regla de oro: TODO filtra por empresa (tenantId == id_empresa). Un comprador
// de una empresa jamás debe ver los procesos (ni las subastas) de otra.
//
// Flujo: borrador -> publicado -> en_subasta -> cerrada -> adjudicada -> aprobada.
// - El comprador crea, publica, adjudica.
// - La autoridad aprueba la adjudicación.

import { simularRed, ApiError } from './client.js'
import { procesosCompra, nextId } from './mockDb.js'
import { ESTADO_PROCESO, esEditable } from '../domain/compras.js'

function delTenant(tenantId) {
  return procesosCompra.filter((p) => p.tenantId === tenantId)
}

export function listarProcesos({ tenantId, busqueda = '', estado = '' }) {
  return simularRed(() => {
    let resultado = delTenant(tenantId)

    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      resultado = resultado.filter((p) =>
        `${p.codigo} ${p.titulo}`.toLowerCase().includes(q),
      )
    }
    if (estado) {
      resultado = resultado.filter((p) => p.estado === estado)
    }
    return resultado.map((p) => ({ ...p }))
  })
}

// Legajos: las compras ya adjudicadas/aprobadas de la empresa, con su resultado.
// Es el "archivo" de compras realizadas que ve el comprador.
export function listarComprasRealizadas({ tenantId, busqueda = '' }) {
  return simularRed(() => {
    let filas = procesosCompra
      .filter(
        (p) =>
          p.tenantId === tenantId &&
          (p.estado === ESTADO_PROCESO.ADJUDICADA ||
            p.estado === ESTADO_PROCESO.APROBADA),
      )
      .map((p) => ({
        id: p.id,
        codigo: p.codigo,
        titulo: p.titulo,
        estado: p.estado,
        proveedor: p.adjudicacion?.proveedor ?? '—',
        monto: p.adjudicacion?.monto ?? 0,
        fecha: p.adjudicacion?.fecha ?? p.creadoEn,
      }))

    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      filas = filas.filter((f) =>
        `${f.codigo} ${f.titulo} ${f.proveedor}`.toLowerCase().includes(q),
      )
    }
    return filas
  })
}

export function obtenerProceso({ tenantId, id }) {
  return simularRed(() => {
    const proceso = procesosCompra.find((p) => p.id === id && p.tenantId === tenantId)
    if (!proceso) throw new ApiError('Proceso de compra no encontrado.', 404)
    return { ...proceso }
  })
}

export function crearProceso({ tenantId, compradorId, datos }) {
  return simularRed(() => {
    validar(datos)
    const proceso = {
      id: nextId('pc'),
      tenantId,
      codigo: generarCodigo(),
      titulo: datos.titulo.trim(),
      descripcion: datos.descripcion?.trim() ?? '',
      presupuestoEstimado: Number(datos.presupuestoEstimado) || 0,
      estado: ESTADO_PROCESO.BORRADOR, // nace como borrador
      compradorId,
      creadoEn: hoy(),
    }
    procesosCompra.push(proceso)
    return { ...proceso }
  })
}

export function actualizarProceso({ tenantId, id, datos }) {
  return simularRed(() => {
    const indice = buscarIndice(tenantId, id)
    if (!esEditable(procesosCompra[indice].estado)) {
      throw new ApiError('Solo se puede editar un proceso en borrador.', 409)
    }
    validar(datos)
    procesosCompra[indice] = {
      ...procesosCompra[indice],
      titulo: datos.titulo.trim(),
      descripcion: datos.descripcion?.trim() ?? '',
      presupuestoEstimado: Number(datos.presupuestoEstimado) || 0,
    }
    return { ...procesosCompra[indice] }
  })
}

// Publica el proceso: borrador -> publicado. A partir de acá ya no se edita y
// queda listo para invitar proveedores y abrir la subasta. (No hay aprobación previa.)
export function publicarProceso({ tenantId, id }) {
  return simularRed(() => {
    const indice = buscarIndice(tenantId, id)
    if (procesosCompra[indice].estado !== ESTADO_PROCESO.BORRADOR) {
      throw new ApiError('Solo se puede publicar un borrador.', 409)
    }
    procesosCompra[indice] = {
      ...procesosCompra[indice],
      estado: ESTADO_PROCESO.PUBLICADO,
    }
    return { ...procesosCompra[indice] }
  })
}

// El comprador ADJUDICA: elige el proveedor ganador (propone). El proceso queda
// pendiente de la aprobación de la Autoridad.
export function adjudicarProceso({ tenantId, id, compradorId, proveedor, monto }) {
  return simularRed(() => {
    const indice = buscarIndice(tenantId, id)
    if (procesosCompra[indice].estado !== ESTADO_PROCESO.CERRADA) {
      throw new ApiError('Solo se puede adjudicar una subasta cerrada.', 409)
    }
    if (!proveedor) throw new ApiError('Elegí el proveedor a adjudicar.', 422)
    procesosCompra[indice] = {
      ...procesosCompra[indice],
      estado: ESTADO_PROCESO.ADJUDICADA,
      adjudicacion: {
        compradorId,
        proveedor,
        monto: Number(monto) || 0,
        fecha: hoy(),
      },
      aprobacion: null,
    }
    return { ...procesosCompra[indice] }
  })
}

// La AUTORIDAD aprueba la adjudicación propuesta por el comprador.
export function aprobarAdjudicacion({ tenantId, id, autoridadId }) {
  return simularRed(() => {
    const indice = buscarIndice(tenantId, id)
    if (procesosCompra[indice].estado !== ESTADO_PROCESO.ADJUDICADA) {
      throw new ApiError('Este proceso no está pendiente de aprobación.', 409)
    }
    procesosCompra[indice] = {
      ...procesosCompra[indice],
      estado: ESTADO_PROCESO.APROBADA,
      aprobacion: { autoridadId, fecha: hoy(), estado: 'aprobada' },
    }
    return { ...procesosCompra[indice] }
  })
}

// La AUTORIDAD rechaza la adjudicación: vuelve a "cerrada" para que el comprador
// adjudique de nuevo. Queda registrado el motivo.
export function rechazarAdjudicacion({ tenantId, id, autoridadId, motivo }) {
  return simularRed(() => {
    if (!motivo?.trim()) {
      throw new ApiError('Para rechazar hay que indicar un motivo.', 422)
    }
    const indice = buscarIndice(tenantId, id)
    if (procesosCompra[indice].estado !== ESTADO_PROCESO.ADJUDICADA) {
      throw new ApiError('Este proceso no está pendiente de aprobación.', 409)
    }
    procesosCompra[indice] = {
      ...procesosCompra[indice],
      estado: ESTADO_PROCESO.CERRADA,
      adjudicacion: null,
      aprobacion: { autoridadId, fecha: hoy(), estado: 'rechazada', motivo: motivo.trim() },
    }
    return { ...procesosCompra[indice] }
  })
}

function buscarIndice(tenantId, id) {
  const indice = procesosCompra.findIndex(
    (p) => p.id === id && p.tenantId === tenantId,
  )
  if (indice === -1) throw new ApiError('Proceso de compra no encontrado.', 404)
  return indice
}

function validar(datos) {
  if (!datos.titulo?.trim()) throw new ApiError('El título es obligatorio.', 422)
  if (datos.presupuestoEstimado && Number(datos.presupuestoEstimado) < 0) {
    throw new ApiError('El presupuesto no puede ser negativo.', 422)
  }
}

// Código correlativo tipo PC-0003. En el backend real lo daría la base por empresa.
function generarCodigo() {
  const numero = procesosCompra.length + 1
  return `PC-${String(numero).padStart(4, '0')}`
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}
