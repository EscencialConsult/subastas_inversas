import { apiFetch, ApiError } from './client.js'
import { ESTADO_PROCESO } from '../domain/compras.js'

const ESTADOS_BACK_TO_FRONT = {
  0: ESTADO_PROCESO.BORRADOR,
  1: ESTADO_PROCESO.PENDIENTE_APROBACION,
  2: ESTADO_PROCESO.APROBADO,
  3: ESTADO_PROCESO.RECHAZADO,
  4: ESTADO_PROCESO.EN_SUBASTA,
  5: ESTADO_PROCESO.EVALUACION,
  6: ESTADO_PROCESO.ADJUDICADO,
  7: ESTADO_PROCESO.CERRADO,
  8: ESTADO_PROCESO.CONTRATADO,
  9: ESTADO_PROCESO.ORDEN_EMITIDA,
  10: ESTADO_PROCESO.RECIBIDO,

  Draft: ESTADO_PROCESO.BORRADOR,
  PendingApproval: ESTADO_PROCESO.PENDIENTE_APROBACION,
  Approved: ESTADO_PROCESO.APROBADO,
  Rejected: ESTADO_PROCESO.RECHAZADO,
  InAuction: ESTADO_PROCESO.EN_SUBASTA,
  Evaluation: ESTADO_PROCESO.EVALUACION,
  Adjudicated: ESTADO_PROCESO.ADJUDICADO,
  Closed: ESTADO_PROCESO.CERRADO,
  Contracted: ESTADO_PROCESO.CONTRATADO,
  PurchaseOrderIssued: ESTADO_PROCESO.ORDEN_EMITIDA,
  Received: ESTADO_PROCESO.RECIBIDO,
}

const ESTADOS_FRONT_TO_BACK = {
  [ESTADO_PROCESO.BORRADOR]: 'Draft',
  [ESTADO_PROCESO.PENDIENTE_APROBACION]: 'PendingApproval',
  [ESTADO_PROCESO.APROBADO]: 'Approved',
  [ESTADO_PROCESO.RECHAZADO]: 'Rejected',
  [ESTADO_PROCESO.EN_SUBASTA]: 'InAuction',
  [ESTADO_PROCESO.EVALUACION]: 'Evaluation',
  [ESTADO_PROCESO.ADJUDICADO]: 'Adjudicated',
  [ESTADO_PROCESO.CERRADO]: 'Closed',
  [ESTADO_PROCESO.CONTRATADO]: 'Contracted',
  [ESTADO_PROCESO.ORDEN_EMITIDA]: 'PurchaseOrderIssued',
  [ESTADO_PROCESO.RECIBIDO]: 'Received',
}

export async function listarProcesos({ tenantId, busqueda = '', estado = '' }) {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())
  if (estado && ESTADOS_FRONT_TO_BACK[estado]) {
    params.set('status', ESTADOS_FRONT_TO_BACK[estado])
  }

  const query = params.toString()
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes${query ? `?${query}` : ''}`)
  const items = Array.isArray(data) ? data : (data.items ?? [])
  return items.map(mapProceso)
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

export async function aprobarProceso({ tenantId, id, aprobadorId }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approverId: aprobadorId }),
  })
  return mapProceso(data)
}

export async function rechazarProceso({ tenantId, id, aprobadorId, motivo }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ approverId: aprobadorId, motivo }),
  })
  return mapProceso(data)
}

export async function registrarEvaluacion({ tenantId, id, evaluadorId, recomendadoProveedor, observaciones }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${id}/evaluate`, {
    method: 'POST',
    body: JSON.stringify({ evaluadorId, recomendadoProveedor, observaciones }),
  })
  return mapProceso(data)
}

export async function adjudicarProceso({ tenantId, id, aprobadorId }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${id}/adjudicate`, {
    method: 'POST',
    body: JSON.stringify({ aprobadorId }),
  })
  return mapProceso(data)
}

export async function descargarActaPdf({ tenantId, id, codigo }) {
  return descargarPdf({
    url: `http://localhost:5185/api/companies/${tenantId}/purchase-processes/${id}/award/pdf`,
    nombre: `Acta-Adjudicacion-${codigo}.pdf`,
    mensajeError: 'No se pudo descargar el acta.',
  })
}

export async function generarContrato({ tenantId, procesoId, awardId = null, terms = '', startDateUtc = null, endDateUtc = null }) {
  return apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/contract`, {
    method: 'POST',
    body: JSON.stringify({
      companyId: tenantId,
      purchaseProcessId: procesoId,
      awardId,
      terms,
      startDateUtc,
      endDateUtc,
    }),
  })
}

export async function emitirOrdenCompra({ tenantId, contractId, expectedDeliveryDateUtc = null, observations = '' }) {
  return apiFetch(`/api/companies/${tenantId}/contracts/${contractId}/purchase-order`, {
    method: 'POST',
    body: JSON.stringify({
      companyId: tenantId,
      contractId,
      expectedDeliveryDateUtc,
      observations,
    }),
  })
}

export async function confirmarRecepcion({ tenantId, purchaseOrderId, receivedById, observations = '', items = [] }) {
  return apiFetch(`/api/companies/${tenantId}/purchase-orders/${purchaseOrderId}/receptions`, {
    method: 'POST',
    body: JSON.stringify({
      companyId: tenantId,
      purchaseOrderId,
      receivedById,
      status: observations.trim() ? 'AcceptedWithObservations' : 'Accepted',
      observations,
      items: items
        .filter((item) => Number(item.quantityReceived) > 0)
        .map((item) => ({
          purchaseItemId: item.purchaseItemId,
          quantityReceived: Number(item.quantityReceived),
        })),
    }),
  })
}

export async function descargarContratoPdf({ tenantId, contrato }) {
  return descargarPdf({
    url: `http://localhost:5185/api/companies/${tenantId}/contracts/${contrato.id}/pdf`,
    nombre: `Contrato-${contrato.number}.pdf`,
    mensajeError: 'No se pudo descargar el contrato.',
  })
}

export async function descargarOrdenCompraPdf({ tenantId, orden }) {
  return descargarPdf({
    url: `http://localhost:5185/api/companies/${tenantId}/purchase-orders/${orden.id}/pdf`,
    nombre: `Orden-Compra-${orden.number}.pdf`,
    mensajeError: 'No se pudo descargar la orden de compra.',
  })
}

export async function descargarRecepcionPdf({ tenantId, recepcion }) {
  return descargarPdf({
    url: `http://localhost:5185/api/companies/${tenantId}/receptions/${recepcion.id}/pdf`,
    nombre: `Recepcion-${recepcion.fecha}.pdf`,
    mensajeError: 'No se pudo descargar la confirmacion de recepcion.',
  })
}

async function descargarPdf({ url, nombre, mensajeError }) {
  let token = ''
  try {
    const sesion = JSON.parse(localStorage.getItem('sicst.sesion'))
    token = sesion?.token || ''
  } catch (e) {
    console.error('Error al leer token para descargar acta:', e)
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    let errorMsg = mensajeError
    try {
      const json = await res.json()
      errorMsg = json.message || errorMsg
    } catch {
      // La respuesta puede no ser JSON.
    }
    throw new ApiError(errorMsg, res.status)
  }

  const blob = await res.blob()
  const fileUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = fileUrl
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(fileUrl)
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
    motivoRechazo: p.rejectionReason ?? null,
    evaluacion: p.evaluation ? {
      evaluadorId: p.evaluation.evaluadorId,
      recomendadoProveedor: p.evaluation.recomendadoProveedor,
      observaciones: p.evaluation.observaciones,
      fecha: p.evaluation.fecha,
    } : null,
    adjudicaciones: (p.awards ?? []).map(mapAward),
    adjudicacion: p.award ? {
      proveedor: p.award.proveedor,
      fecha: p.award.fecha,
      monto: p.award.monto,
      aprobadorId: p.award.aprobadorId,
      observaciones: p.award.observaciones,
      actaUrl: p.award.actaUrl ?? null,
      id: p.award.id,
      items: p.award.items ?? [],
    } : null,
    contratos: (p.contracts ?? []).map(mapContract),
    contrato: p.contract ? {
      id: p.contract.id,
      number: p.contract.number,
      supplierName: p.contract.supplierName,
      amount: p.contract.amount,
      status: p.contract.status,
      terms: p.contract.terms,
      startDate: p.contract.startDateUtc?.slice(0, 10),
      endDate: p.contract.endDateUtc?.slice(0, 10) ?? null,
      signedAt: p.contract.signedAtUtc?.slice(0, 10) ?? null,
      documentUrl: p.contract.documentUrl ?? null,
    } : null,
    ordenesCompra: (p.purchaseOrders ?? []).map(mapPurchaseOrder),
    ordenCompra: p.purchaseOrder ? {
      id: p.purchaseOrder.id,
      contractId: p.purchaseOrder.contractId,
      number: p.purchaseOrder.number,
      supplierName: p.purchaseOrder.supplierName,
      amount: p.purchaseOrder.amount,
      status: p.purchaseOrder.status,
      issuedAt: p.purchaseOrder.issuedAtUtc?.slice(0, 10),
      expectedDeliveryDate: p.purchaseOrder.expectedDeliveryDateUtc?.slice(0, 10) ?? null,
      observations: p.purchaseOrder.observations ?? '',
      documentUrl: p.purchaseOrder.documentUrl ?? null,
      recepciones: (p.purchaseOrder.receptions ?? []).map((r) => ({
        id: r.id,
        status: r.status,
        receivedById: r.receivedById,
        receivedByName: r.receivedByName,
        fecha: r.receivedAtUtc?.slice(0, 10),
        observations: r.observations ?? '',
        documentUrl: r.documentUrl ?? null,
        items: r.items ?? [],
      })),
    } : null,
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

function mapContract(contract) {
  return {
    id: contract.id,
    awardId: contract.awardId,
    number: contract.number,
    supplierName: contract.supplierName,
    amount: contract.amount,
    status: contract.status,
    terms: contract.terms,
    startDate: contract.startDateUtc?.slice(0, 10),
    endDate: contract.endDateUtc?.slice(0, 10) ?? null,
    signedAt: contract.signedAtUtc?.slice(0, 10) ?? null,
    documentUrl: contract.documentUrl ?? null,
  }
}

function mapPurchaseOrder(order) {
  return {
    id: order.id,
    contractId: order.contractId,
    number: order.number,
    supplierName: order.supplierName,
    amount: order.amount,
    status: order.status,
    issuedAt: order.issuedAtUtc?.slice(0, 10),
    expectedDeliveryDate: order.expectedDeliveryDateUtc?.slice(0, 10) ?? null,
    observations: order.observations ?? '',
    documentUrl: order.documentUrl ?? null,
    recepciones: (order.receptions ?? []).map((r) => ({
      id: r.id,
      status: r.status,
      receivedById: r.receivedById,
      receivedByName: r.receivedByName,
      fecha: r.receivedAtUtc?.slice(0, 10),
      observations: r.observations ?? '',
      documentUrl: r.documentUrl ?? null,
      items: r.items ?? [],
    })),
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
