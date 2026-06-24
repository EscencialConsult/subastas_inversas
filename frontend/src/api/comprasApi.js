import { apiFetch, ApiError } from './client.js'
import { ESTADO_PROCESO } from '../domain/compras.js'

const ESTADOS_BACK_TO_FRONT = {
  0: ESTADO_PROCESO.BORRADOR,
  1: ESTADO_PROCESO.PUBLICADO,
  2: ESTADO_PROCESO.PUBLICADO,
  3: ESTADO_PROCESO.CANCELADA,
  4: ESTADO_PROCESO.EN_SUBASTA,
  5: ESTADO_PROCESO.CERRADA,
  6: ESTADO_PROCESO.ADJUDICADA,
  7: ESTADO_PROCESO.CERRADA,
  8: ESTADO_PROCESO.APROBADA,
  9: ESTADO_PROCESO.APROBADA,
  10: ESTADO_PROCESO.APROBADA,

  Draft: ESTADO_PROCESO.BORRADOR,
  PendingApproval: ESTADO_PROCESO.PUBLICADO,
  Approved: ESTADO_PROCESO.PUBLICADO,
  Rejected: ESTADO_PROCESO.CANCELADA,
  InAuction: ESTADO_PROCESO.EN_SUBASTA,
  Evaluation: ESTADO_PROCESO.CERRADA,
  Adjudicated: ESTADO_PROCESO.ADJUDICADA,
  Closed: ESTADO_PROCESO.CERRADA,
  Contracted: ESTADO_PROCESO.APROBADA,
  PurchaseOrderIssued: ESTADO_PROCESO.APROBADA,
  Received: ESTADO_PROCESO.APROBADA,
}

const ESTADOS_FRONT_TO_BACK = {
  [ESTADO_PROCESO.BORRADOR]: 'Draft',
  [ESTADO_PROCESO.PUBLICADO]: 'Approved',
  [ESTADO_PROCESO.EN_SUBASTA]: 'InAuction',
  [ESTADO_PROCESO.CERRADA]: 'Evaluation',
  [ESTADO_PROCESO.ADJUDICADA]: 'Adjudicated',
  [ESTADO_PROCESO.APROBADA]: 'Contracted',
  [ESTADO_PROCESO.CANCELADA]: 'Rejected',
}

export async function listarProcesos({ tenantId, busqueda = '', estado = '' }) {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())
  if (estado && ESTADOS_FRONT_TO_BACK[estado]) params.set('status', ESTADOS_FRONT_TO_BACK[estado])

  const query = params.toString()
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes${query ? `?${query}` : ''}`)
  const items = Array.isArray(data) ? data : (data.items ?? [])
  return items.map(mapProceso)
}

export async function listarComprasRealizadas({ tenantId, busqueda = '' }) {
  const procesos = await listarProcesos({ tenantId, busqueda })
  return procesos
    .filter((p) => p.estado === ESTADO_PROCESO.ADJUDICADA || p.estado === ESTADO_PROCESO.APROBADA)
    .map((p) => ({
      id: p.id,
      codigo: p.codigo,
      titulo: p.titulo,
      estado: p.estado,
      proveedor: p.adjudicacion?.proveedor ?? '---',
      monto: p.adjudicacion?.monto ?? 0,
      fecha: p.adjudicacion?.fecha ?? p.creadoEn,
    }))
}

export async function obtenerProceso({ tenantId, id }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${id}`)
  return mapProceso(data)
}

export async function crearProceso({ tenantId, compradorId, datos }) {
  validar(datos)

  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes`, {
    method: 'POST',
    body: JSON.stringify({
      companyId: tenantId,
      buyerId: compradorId,
      title: datos.titulo.trim(),
      description: datos.descripcion?.trim() ?? '',
      estimatedBudget: Number(datos.presupuestoEstimado) || 0,
      items: normalizarItems(datos.items),
    }),
  })

  return mapProceso(data)
}

export async function actualizarProceso({ tenantId, id, datos }) {
  validar(datos)

  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      id,
      companyId: tenantId,
      title: datos.titulo.trim(),
      description: datos.descripcion?.trim() ?? '',
      estimatedBudget: Number(datos.presupuestoEstimado) || 0,
      items: normalizarItems(datos.items),
    }),
  })

  return mapProceso(data)
}

export async function publicarProceso({ tenantId, id }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${id}/publish`, {
    method: 'POST',
  })
  return mapProceso(data)
}

export async function adjudicarProceso({ tenantId, id, compradorId, proveedor }) {
  if (!proveedor) throw new ApiError('Elegi el proveedor a adjudicar.', 422)

  await apiFetch(`/api/companies/${tenantId}/purchase-processes/${id}/evaluate`, {
    method: 'POST',
    body: JSON.stringify({
      evaluadorId: compradorId,
      recomendadoProveedor: proveedor,
      observaciones: 'Adjudicacion propuesta por comprador.',
    }),
  })

  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${id}/adjudicate`, {
    method: 'POST',
    body: JSON.stringify({ aprobadorId: compradorId }),
  })

  return mapProceso(data)
}

export async function aprobarAdjudicacion({ tenantId, id, autoridadId }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approverId: autoridadId }),
  })
  return mapProceso(data)
}

export async function rechazarAdjudicacion({ tenantId, id, autoridadId, motivo }) {
  if (!motivo?.trim()) {
    throw new ApiError('Para rechazar hay que indicar un motivo.', 422)
  }

  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ approverId: autoridadId, motivo }),
  })
  return mapProceso(data)
}

function mapProceso(p) {
  const adjudicaciones = (p.awards ?? []).map(mapAward)
  const adjudicacion = p.award ? mapAward(p.award) : (adjudicaciones[0] ?? null)

  return {
    id: p.id,
    tenantId: p.companyId,
    compradorId: p.buyerId,
    codigo: p.code,
    titulo: p.title,
    descripcion: p.description,
    presupuestoEstimado: p.estimatedBudget,
    estado: ESTADOS_BACK_TO_FRONT[p.status] ?? ESTADO_PROCESO.BORRADOR,
    creadoEn: p.createdAtUtc?.slice(0, 10),
    publicadoEn: p.publishedAtUtc?.slice(0, 10) ?? null,
    cerradoEn: p.closedAtUtc?.slice(0, 10) ?? null,
    motivoRechazo: p.rejectionReason ?? null,
    evaluacion: p.evaluation ? {
      evaluadorId: p.evaluation.evaluadorId,
      recomendadoProveedor: p.evaluation.recomendadoProveedor,
      observaciones: p.evaluation.observaciones,
      fecha: p.evaluation.fecha,
    } : null,
    adjudicaciones,
    adjudicacion,
    aprobacion: null,
    items: p.items ?? [],
  }
}

function mapAward(award) {
  return {
    id: award.id,
    proveedor: award.proveedor,
    fecha: award.fecha,
    monto: award.monto,
    aprobadorId: award.aprobadorId,
    observaciones: award.observaciones,
    actaUrl: award.actaUrl ?? null,
    items: award.items ?? [],
  }
}

function validar(datos) {
  if (!datos.titulo?.trim()) throw new ApiError('El titulo es obligatorio.', 422)
  if (datos.presupuestoEstimado && Number(datos.presupuestoEstimado) < 0) {
    throw new ApiError('El presupuesto no puede ser negativo.', 422)
  }
}

function normalizarItems(items = []) {
  return items
    .filter((item) => item.description?.trim())
    .map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity) || 1,
      unit: item.unit?.trim() || 'unidad',
      estimatedUnitPrice: item.estimatedUnitPrice ? Number(item.estimatedUnitPrice) : null,
    }))
}
