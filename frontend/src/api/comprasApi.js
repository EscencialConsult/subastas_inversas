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

export async function listarProcesosParaAuditoria({ tenantId, busqueda = '', estado = '' }) {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())
  if (estado && ESTADOS_FRONT_TO_BACK[estado]) params.set('status', ESTADOS_FRONT_TO_BACK[estado])

  const query = params.toString()
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/audit${query ? `?${query}` : ''}`)
  const items = Array.isArray(data) ? data : (data.items ?? [])
  return items.map(mapProceso)
}

export async function obtenerProcesoParaAuditoria({ tenantId, id }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${id}/audit`)
  return mapProceso(data)
}

export async function listarProcesosParaAprobacion({ tenantId, busqueda = '', estado = '' }) {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())
  if (estado && estado !== ESTADO_PROCESO.APROBADA && ESTADOS_FRONT_TO_BACK[estado]) {
    params.set('status', ESTADOS_FRONT_TO_BACK[estado])
  }

  const query = params.toString()
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/approvals${query ? `?${query}` : ''}`)
  const items = Array.isArray(data) ? data : (data.items ?? [])
  const procesos = items.map(mapProceso)
  return estado === ESTADO_PROCESO.APROBADA
    ? procesos.filter((p) => p.estado === ESTADO_PROCESO.APROBADA)
    : procesos
}

export async function obtenerProcesoParaAprobacion({ tenantId, id }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${id}/approval`)
  return mapProceso(data)
}

export async function sugerirModalidadContratacion({ tenantId, monto }) {
  const amount = Number(monto)
  if (!Number.isFinite(amount) || amount < 0) return null

  return apiFetch(`/api/companies/${tenantId}/configuration/contracting-modes/suggest?amount=${amount}`)
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
      contractingModeId: datos.modalidadContratacionId || null,
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
      contractingModeId: datos.modalidadContratacionId || null,
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

export async function listarInvitacionesProceso({ tenantId, procesoId }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/invitations`)
  return data.map(mapInvitacion)
}

export async function listarInvitacionesProcesoAudit({ tenantId, procesoId }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/invitations/audit`)
  return data.map(mapInvitacion)
}

export async function invitarProveedorAProceso({ tenantId, procesoId, proveedorId }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/invitations`, {
    method: 'POST',
    body: JSON.stringify({
      companyId: tenantId,
      purchaseProcessId: procesoId,
      supplierId: proveedorId,
    }),
  })
  return mapInvitacion(data)
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

export async function listarProcesosParaEvaluacion({ tenantId, busqueda = '' }) {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())
  params.set('status', 'Evaluation')

  const query = params.toString()
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/evaluate?${query}`)
  const items = Array.isArray(data) ? data : (data.items ?? [])
  return items.map(mapProceso)
}

export async function obtenerProcesoParaEvaluacion({ tenantId, id }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${id}/evaluate`)
  return mapProceso(data)
}

export async function obtenerCriteriosEvaluacion({ tenantId, procesoId }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluation-criteria`)
  return data.map(c => ({
    id: c.id,
    purchaseProcessId: c.purchaseProcessId,
    name: c.name,
    description: c.description,
    type: c.type,
    weight: c.weight,
    sortOrder: c.sortOrder,
    createdById: c.createdById,
    createdByName: c.createdByName,
    createdAtUtc: c.createdAtUtc,
    updatedAtUtc: c.updatedAtUtc,
  }))
}

export async function obtenerCriteriosEvaluacionParaEvaluador({ tenantId, procesoId }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluation-criteria/evaluate`)
  return data.map(mapCriterioEvaluacion)
}

export async function guardarCriteriosEvaluacion({ tenantId, procesoId, userId, criteria }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluation-criteria`, {
    method: 'PUT',
    body: JSON.stringify({ userId, criteria }),
  })
  return data.map(mapCriterioEvaluacion)
}

export async function guardarCriteriosEvaluacionParaEvaluador({ tenantId, procesoId, userId, criteria }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluation-criteria/evaluate`, {
    method: 'PUT',
    body: JSON.stringify({ userId, criteria }),
  })
  return data.map(mapCriterioEvaluacion)
}

export async function evaluarProveedores({ tenantId, procesoId, evaluatorId, supplierEvaluations }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluate-suppliers`, {
    method: 'POST',
    body: JSON.stringify({ evaluatorId, supplierEvaluations }),
  })
  return mapEvaluationResults(data)
}

export async function obtenerResultadosEvaluacion({ tenantId, procesoId }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluation-results`)
  return mapEvaluationResults(data)
}

export async function obtenerResultadosEvaluacionParaEvaluador({ tenantId, procesoId }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluation-results/evaluate`)
  return mapEvaluationResults(data)
}

export async function obtenerResultadosEvaluacionParaAuditoria({ tenantId, procesoId }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluation-results/audit`)
  return mapEvaluationResults(data)
}

function mapCriterioEvaluacion(c) {
  return {
    id: c.id,
    purchaseProcessId: c.purchaseProcessId,
    name: c.name,
    description: c.description,
    type: c.type,
    weight: c.weight,
    sortOrder: c.sortOrder,
    createdById: c.createdById,
    createdByName: c.createdByName,
    createdAtUtc: c.createdAtUtc,
    updatedAtUtc: c.updatedAtUtc,
  }
}

function mapEvaluationResults(data) {
  return {
    purchaseProcessId: data.purchaseProcessId,
    criteria: (data.criteria ?? []).map(mapCriterioEvaluacion),
    supplierEvaluations: (data.supplierEvaluations ?? []).map(e => ({
      id: e.id,
      purchaseProcessId: e.purchaseProcessId,
      supplierId: e.supplierId,
      supplierName: e.supplierName,
      totalWeightedScore: e.totalWeightedScore,
      isExcluded: e.isExcluded,
      excludedReason: e.excludedReason,
      evaluatedById: e.evaluatedById,
      evaluatedByName: e.evaluatedByName,
      evaluatedAtUtc: e.evaluatedAtUtc,
      criterionResults: (e.criterionResults ?? []).map(r => ({
        id: r.id,
        evaluationCriterionId: r.evaluationCriterionId,
        criterionName: r.criterionName,
        criterionType: r.criterionType,
        score: r.score,
        passed: r.passed,
        notes: r.notes,
      })),
    })),
  }
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
  const estado = mapEstadoProceso(p.status, adjudicaciones)

  return {
    id: p.id,
    tenantId: p.companyId,
    compradorId: p.buyerId,
    codigo: p.code,
    titulo: p.title,
    descripcion: p.description,
    presupuestoEstimado: p.estimatedBudget,
    modalidadContratacionId: p.contractingModeId ?? '',
    estado,
    creadoEn: p.createdAtUtc?.slice(0, 10),
    publicadoEn: p.publishedAtUtc?.slice(0, 10) ?? null,
    cerradoEn: p.closedAtUtc?.slice(0, 10) ?? null,
    motivoRechazo: p.rejectionReason ?? null,
    tieneSubasta: Boolean(p.hasAuction),
    specificationsHash: p.specificationsHash ?? null,
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

function mapEstadoProceso(status, adjudicaciones = []) {
  const estadoBase = ESTADOS_BACK_TO_FRONT[status] ?? ESTADO_PROCESO.BORRADOR
  const aprobadoConAdjudicacion =
    estadoBase === ESTADO_PROCESO.PUBLICADO && adjudicaciones.length > 0

  return aprobadoConAdjudicacion ? ESTADO_PROCESO.APROBADA : estadoBase
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

function mapInvitacion(invitation) {
  return {
    id: invitation.id,
    procesoId: invitation.purchaseProcessId,
    proveedorId: invitation.supplierId,
    estado: ESTADOS_INVITACION[invitation.status] ?? 'pendiente',
    invitadoEn: invitation.invitedAtUtc,
    proveedor: invitation.supplierBusinessName,
    cuit: invitation.supplierCuit,
    tituloProceso: invitation.processTitle,
    codigoProceso: invitation.processCode,
    rejectionReason: invitation.rejectionReason ?? null,
    calificacion: invitation.qualificationStatus
      ? mapCalificacion(invitation)
      : null,
  }
}

function mapCalificacion(inv) {
  return {
    estado: ESTADOS_CALIFICACION[inv.qualificationStatus] ?? 'pendiente',
    notas: inv.qualificationNotes ?? null,
    evaluadorId: inv.qualifiedById ?? null,
    evaluador: inv.qualifiedByName ?? null,
    fecha: inv.qualifiedAtUtc ?? null,
  }
}

const ESTADOS_INVITACION = {
  0: 'pendiente',
  1: 'aceptada',
  2: 'rechazada',
  Pending: 'pendiente',
  Accepted: 'aceptada',
  Rejected: 'rechazada',
}

const ESTADOS_CALIFICACION = {
  0: 'pendiente',
  1: 'aprobado',
  2: 'observado',
  3: 'rechazado',
  Pending: 'pendiente',
  Approved: 'aprobado',
  Observed: 'observado',
  Rejected: 'rechazado',
}

export async function listarProcesosParaCalificacion({ tenantId, busqueda = '' }) {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())

  const query = params.toString()
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/qualification${query ? `?${query}` : ''}`)
  const items = Array.isArray(data) ? data : (data.items ?? [])
  return items.map(mapProceso)
}

export async function obtenerProveedoresDeProceso({ tenantId, procesoId }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/suppliers`)
  return data.map(s => ({
    invitationId: s.invitationId,
    supplierId: s.supplierId,
    businessName: s.businessName,
    cuit: s.cuit,
    calificacion: s.qualificationStatus
      ? {
          estado: ESTADOS_CALIFICACION[s.qualificationStatus] ?? 'pendiente',
          notas: s.qualificationNotes ?? null,
          evaluadorId: s.qualifiedById ?? null,
          evaluador: s.qualifiedByName ?? null,
          fecha: s.qualifiedAtUtc ?? null,
        }
      : null,
  }))
}

export async function calificarProveedor({ tenantId, procesoId, invitationId, evaluatorId, qualificationStatus, notes }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/invitations/${invitationId}/qualify`, {
    method: 'POST',
    body: JSON.stringify({ evaluatorId, qualificationStatus, notes }),
  })
  return {
    invitationId: data.invitationId,
    supplierId: data.supplierId,
    businessName: data.businessName,
    cuit: data.cuit,
    calificacion: {
      estado: ESTADOS_CALIFICACION[data.qualificationStatus] ?? 'pendiente',
      notas: data.qualificationNotes ?? null,
      evaluadorId: data.qualifiedById ?? null,
      evaluador: data.qualifiedByName ?? null,
      fecha: data.qualifiedAtUtc ?? null,
    },
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
