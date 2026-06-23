import { apiFetch, ApiError } from './client.js'
import { ESTADO_PROCESO } from '../domain/compras.js'

const ESTADOS_BACK_TO_FRONT = {
  0: ESTADO_PROCESO.BORRADOR,
  1: ESTADO_PROCESO.APROBADO,
  2: ESTADO_PROCESO.CANCELADO,
  Draft: ESTADO_PROCESO.BORRADOR,
  Published: ESTADO_PROCESO.APROBADO,
  Closed: ESTADO_PROCESO.CANCELADO,
}

const ESTADOS_FRONT_TO_BACK = {
  [ESTADO_PROCESO.BORRADOR]: 'Draft',
  [ESTADO_PROCESO.APROBADO]: 'Published',
  [ESTADO_PROCESO.CANCELADO]: 'Closed',
}

export async function listarProcesos({ tenantId, busqueda = '', estado = '' }) {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())
  if (estado && ESTADOS_FRONT_TO_BACK[estado]) {
    params.set('status', ESTADOS_FRONT_TO_BACK[estado])
  }

  const query = params.toString()
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes${query ? `?${query}` : ''}`)
  return data.map(mapProceso)
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

export async function enviarAAprobacion({ tenantId, id }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${id}/publish`, {
    method: 'POST',
  })
  return mapProceso(data)
}

export async function volverABorrador() {
  throw new ApiError('El backend todavia no permite volver un proceso publicado a borrador.', 409)
}

export async function aprobarProceso({ tenantId, id }) {
  return obtenerProceso({ tenantId, id })
}

export async function rechazarProceso() {
  throw new ApiError('El rechazo queda para el circuito de aprobacion del Sprint 7.', 409)
}

export async function registrarEvaluacion() {
  throw new ApiError('La evaluacion queda para el modulo de subasta/adjudicacion.', 409)
}

export async function adjudicarProceso() {
  throw new ApiError('La adjudicacion queda para el Sprint 7.', 409)
}

export async function listarInvitacionesDeProceso({ tenantId, procesoId }) {
  return apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/invitations`)
}

export async function invitarProveedor({ tenantId, procesoId, proveedorId }) {
  return apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/invitations`, {
    method: 'POST',
    body: JSON.stringify({
      companyId: tenantId,
      purchaseProcessId: procesoId,
      supplierId: proveedorId,
    }),
  })
}

function mapProceso(p) {
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
    items: p.items ?? [],
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
