// API simulada de procesos de compra.
//
// Mismo principio que usuarios: TODO filtra por tenant. Un comprador de un
// municipio jamás debe ver los procesos (ni las futuras subastas) de otro.

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
    const indice = procesosCompra.findIndex(
      (p) => p.id === id && p.tenantId === tenantId,
    )
    if (indice === -1) throw new ApiError('Proceso de compra no encontrado.', 404)
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

// Envía el proceso al circuito de aprobación: borrador -> pendiente de aprobación.
export function enviarAAprobacion({ tenantId, id }) {
  return simularRed(() => {
    const indice = procesosCompra.findIndex(
      (p) => p.id === id && p.tenantId === tenantId,
    )
    if (indice === -1) throw new ApiError('Proceso de compra no encontrado.', 404)
    if (procesosCompra[indice].estado !== ESTADO_PROCESO.BORRADOR) {
      throw new ApiError('Solo se puede enviar a aprobación un borrador.', 409)
    }
    procesosCompra[indice] = {
      ...procesosCompra[indice],
      estado: ESTADO_PROCESO.PENDIENTE_APROBACION,
    }
    return { ...procesosCompra[indice] }
  })
}

// Vuelve un proceso RECHAZADO a borrador, para que el comprador lo corrija
// y lo vuelva a enviar. Limpia los datos de la decisión anterior.
export function volverABorrador({ tenantId, id }) {
  return simularRed(() => {
    const proceso = procesosCompra.find((p) => p.id === id && p.tenantId === tenantId)
    if (!proceso) throw new ApiError('Proceso de compra no encontrado.', 404)
    if (proceso.estado !== ESTADO_PROCESO.RECHAZADO) {
      throw new ApiError('Solo un proceso rechazado puede volver a borrador.', 409)
    }
    proceso.estado = ESTADO_PROCESO.BORRADOR
    proceso.motivoRechazo = ''
    proceso.aprobadorId = null
    proceso.decididoEn = null
    return { ...proceso }
  })
}

// --- Circuito de aprobación (lo usa el Aprobador) ---

export function aprobarProceso({ tenantId, id, aprobadorId }) {
  return simularRed(() => {
    const proceso = decidible(tenantId, id)
    proceso.estado = ESTADO_PROCESO.APROBADO
    proceso.aprobadorId = aprobadorId
    proceso.decididoEn = hoy()
    proceso.motivoRechazo = ''
    return { ...proceso }
  })
}

export function rechazarProceso({ tenantId, id, aprobadorId, motivo }) {
  return simularRed(() => {
    if (!motivo?.trim()) {
      throw new ApiError('Para rechazar hay que indicar un motivo.', 422)
    }
    const proceso = decidible(tenantId, id)
    proceso.estado = ESTADO_PROCESO.RECHAZADO
    proceso.aprobadorId = aprobadorId
    proceso.decididoEn = hoy()
    proceso.motivoRechazo = motivo.trim()
    return { ...proceso }
  })
}

// Busca el proceso y verifica que esté en condiciones de decidirse
// (debe estar pendiente de aprobación). Devuelve la referencia real para mutarla.
function decidible(tenantId, id) {
  const proceso = procesosCompra.find((p) => p.id === id && p.tenantId === tenantId)
  if (!proceso) throw new ApiError('Proceso de compra no encontrado.', 404)
  if (proceso.estado !== ESTADO_PROCESO.PENDIENTE_APROBACION) {
    throw new ApiError('Este proceso no está pendiente de aprobación.', 409)
  }
  return proceso
}

// --- Evaluación (lo usa el Evaluador) ---
// Tras la subasta, el evaluador revisa las ofertas y recomienda un ganador.
// Queda registrada la recomendación; la adjudicación final la decide el aprobador.
export function registrarEvaluacion({
  tenantId,
  id,
  evaluadorId,
  recomendadoProveedor,
  observaciones,
}) {
  return simularRed(() => {
    const proceso = procesosCompra.find((p) => p.id === id && p.tenantId === tenantId)
    if (!proceso) throw new ApiError('Proceso de compra no encontrado.', 404)
    if (proceso.estado !== ESTADO_PROCESO.EVALUACION) {
      throw new ApiError('Este proceso no está en evaluación.', 409)
    }
    if (!recomendadoProveedor) {
      throw new ApiError('Elegí el proveedor recomendado.', 422)
    }
    proceso.evaluacion = {
      evaluadorId,
      recomendadoProveedor,
      observaciones: observaciones?.trim() ?? '',
      fecha: hoy(),
    }
    return { ...proceso }
  })
}

// --- Adjudicación (segunda compuerta del Aprobador) ---
// Tras la evaluación, el aprobador adjudica al proveedor recomendado.
// Es el cierre del circuito: el proceso queda Adjudicado.
export function adjudicarProceso({ tenantId, id, aprobadorId }) {
  return simularRed(() => {
    const proceso = procesosCompra.find((p) => p.id === id && p.tenantId === tenantId)
    if (!proceso) throw new ApiError('Proceso de compra no encontrado.', 404)
    if (proceso.estado !== ESTADO_PROCESO.EVALUACION) {
      throw new ApiError('El proceso no está en etapa de evaluación.', 409)
    }
    if (!proceso.evaluacion) {
      throw new ApiError('Falta la evaluación antes de poder adjudicar.', 409)
    }
    proceso.estado = ESTADO_PROCESO.ADJUDICADO
    proceso.adjudicacion = {
      aprobadorId,
      proveedor: proceso.evaluacion.recomendadoProveedor,
      fecha: hoy(),
    }
    return { ...proceso }
  })
}

function validar(datos) {
  if (!datos.titulo?.trim()) throw new ApiError('El título es obligatorio.', 422)
  if (datos.presupuestoEstimado && Number(datos.presupuestoEstimado) < 0) {
    throw new ApiError('El presupuesto no puede ser negativo.', 422)
  }
}

// Código correlativo tipo PC-0003. En el backend real lo daría la base por tenant.
function generarCodigo() {
  const numero = procesosCompra.length + 1
  return `PC-${String(numero).padStart(4, '0')}`
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}
