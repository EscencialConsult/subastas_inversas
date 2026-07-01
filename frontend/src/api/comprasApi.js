import { apiFetch, ApiError } from './client'
import { ESTADO_PROCESO } from '../domain/compras'

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
  11: ESTADO_PROCESO.DESIERTA,
  12: ESTADO_PROCESO.SUSPENDIDA,

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
  Deserted: ESTADO_PROCESO.DESIERTA,
  SuspendedByChallenge: ESTADO_PROCESO.SUSPENDIDA,
}

const ESTADOS_FRONT_TO_BACK = {
  [ESTADO_PROCESO.BORRADOR]: 'Draft',
  [ESTADO_PROCESO.PUBLICADO]: 'Approved',
  [ESTADO_PROCESO.EN_SUBASTA]: 'InAuction',
  [ESTADO_PROCESO.CERRADA]: 'Evaluation',
  [ESTADO_PROCESO.ADJUDICADA]: 'Adjudicated',
  [ESTADO_PROCESO.APROBADA]: 'Contracted',
  [ESTADO_PROCESO.CANCELADA]: 'Rejected',
  [ESTADO_PROCESO.DESIERTA]: 'Deserted',
  [ESTADO_PROCESO.SUSPENDIDA]: 'SuspendedByChallenge',
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

export async function declararProcesoDesierto({ tenantId, id, operadorId, fundamento }) {
  if (!fundamento?.trim()) {
    throw new ApiError('Para declarar desierto hay que indicar un fundamento.', 422)
  }

  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${id}/desert`, {
    method: 'POST',
    body: JSON.stringify({ operatorId: operadorId, fundamento }),
  })
  return mapProceso(data)
}

export async function suspenderProcesoPorImpugnacion({ tenantId, id, operadorId, fundamento }) {
  if (!fundamento?.trim()) {
    throw new ApiError('Para suspender por impugnacion hay que indicar un fundamento.', 422)
  }

  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${id}/challenge/suspend`, {
    method: 'POST',
    body: JSON.stringify({ operatorId: operadorId, fundamento }),
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

export async function obtenerDictamenAsistido({ tenantId, procesoId }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/award-recommendation`)
  return mapDictamenAsistido(data)
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

function mapDictamenAsistido(data) {
  return {
    procesoId: data.purchaseProcessId,
    proveedorId: data.recommendedSupplierId,
    proveedor: data.recommendedSupplierName,
    monto: data.recommendedAmount,
    ahorroMonto: data.savingsAmount,
    ahorroPorcentaje: data.savingsPercentage,
    puntajeTecnico: data.technicalScore,
    tieneRecomendacion: Boolean(data.hasRecommendation),
    resumen: data.summary,
    riesgos: (data.risks ?? []).map((risk) => ({
      codigo: risk.code,
      severidad: risk.severity,
      mensaje: risk.message,
    })),
    candidatos: (data.candidates ?? []).map((candidate) => ({
      posicion: candidate.position,
      proveedorId: candidate.supplierId,
      proveedor: candidate.supplierName,
      monto: candidate.amount,
      ahorroMonto: candidate.savingsAmount,
      ahorroPorcentaje: candidate.savingsPercentage,
      puntajeTecnico: candidate.technicalScore,
      excluido: Boolean(candidate.isExcluded),
      motivoExclusion: candidate.excludedReason,
      esPab: Boolean(candidate.isPab),
      cantidadLances: candidate.bidCount,
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

export async function devolverAdjudicacion({ tenantId, id, autoridadId, motivo }) {
  if (!motivo?.trim()) {
    throw new ApiError('Para devolver hay que indicar un motivo.', 422)
  }

  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${id}/return`, {
    method: 'POST',
    body: JSON.stringify({ approverId: autoridadId, motivo }),
  })
  return mapProceso(data)
}

export async function confirmarRecepcion({ tenantId, ordenCompraId, receptorId, estado, observaciones, items }) {
  const itemsValidos = (items ?? [])
    .map((item) => ({
      purchaseItemId: item.purchaseItemId,
      quantityReceived: Number(item.quantityReceived),
    }))
    .filter((item) => item.purchaseItemId && Number.isFinite(item.quantityReceived) && item.quantityReceived > 0)

  if (itemsValidos.length === 0) {
    throw new ApiError('La recepcion debe incluir al menos un item con cantidad mayor a cero.', 422)
  }

  const data = await apiFetch(`/api/companies/${tenantId}/purchase-orders/${ordenCompraId}/receptions`, {
    method: 'POST',
    body: JSON.stringify({
      companyId: tenantId,
      purchaseOrderId: ordenCompraId,
      receivedById: receptorId,
      status: estado,
      observations: observaciones ?? '',
      items: itemsValidos,
    }),
  })

  return mapReception(data)
}

export async function registrarPagoContrato({
  tenantId,
  contratoId,
  operadorId,
  fechaPago,
  montoPago,
  montoPenalidad,
  diasDemora,
  notas,
}) {
  const paymentAmount = Number(montoPago) || 0
  const penaltyAmount = Number(montoPenalidad) || 0
  const delayDays = Number(diasDemora) || 0

  if (paymentAmount < 0 || penaltyAmount < 0) {
    throw new ApiError('Los importes de pago y penalidad no pueden ser negativos.', 422)
  }

  if (paymentAmount === 0 && penaltyAmount === 0) {
    throw new ApiError('Ingresá un pago o una penalidad para registrar.', 422)
  }

  if (penaltyAmount > 0 && delayDays <= 0) {
    throw new ApiError('Para registrar una penalidad indicá los días de demora.', 422)
  }

  const data = await apiFetch(`/api/companies/${tenantId}/contracts/${contratoId}/payments`, {
    method: 'POST',
    body: JSON.stringify({
      companyId: tenantId,
      contractId: contratoId,
      registeredById: operadorId,
      paymentDateUtc: fechaPago ? new Date(`${fechaPago}T00:00:00`).toISOString() : null,
      paymentAmount,
      penaltyAmount,
      delayDays,
      notes: notas ?? '',
    }),
  })

  return mapContractPayment(data)
}

function mapProceso(p) {
  const adjudicaciones = (p.awards ?? []).map(mapAward)
  const adjudicacion = p.award ? mapAward(p.award) : (adjudicaciones[0] ?? null)
  const ordenesCompra = (p.purchaseOrders ?? []).map(mapPurchaseOrder)
  const ordenCompra = p.purchaseOrder ? mapPurchaseOrder(p.purchaseOrder) : (ordenesCompra[0] ?? null)
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
    isEvaluationActSigned: Boolean(p.isEvaluationActSigned),
    evaluationActHash: p.evaluationActHash ?? null,
    evaluationActSignature: p.evaluationActSignature ?? null,
    evaluationActSignedAtUtc: p.evaluationActSignedAtUtc ?? null,
    evaluationActSignedById: p.evaluationActSignedById ?? null,
    evaluationActSignedByName: p.evaluationActSignedByName ?? null,
    evaluacion: p.evaluation ? {
      evaluadorId: p.evaluation.evaluadorId,
      recomendadoProveedor: p.evaluation.recomendadoProveedor,
      observaciones: p.evaluation.observaciones,
      fecha: p.evaluation.fecha,
    } : null,
    adjudicaciones,
    adjudicacion,
    contratos: (p.contracts ?? []).map(mapContract),
    contrato: p.contract ? mapContract(p.contract) : null,
    ordenesCompra,
    ordenCompra,
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
    proveedorId: award.supplierId,
    proveedor: award.proveedor,
    fecha: award.fecha,
    monto: award.monto,
    aprobadorId: award.aprobadorId,
    observaciones: award.observaciones,
    actaUrl: award.actaUrl ?? null,
    documentHash: award.documentHash ?? '',
    immutableHash: award.immutableHash ?? '',
    items: award.items ?? [],
  }
}

function mapContract(contract) {
  return {
    id: contract.id,
    awardId: contract.awardId,
    numero: contract.number,
    proveedorId: contract.supplierId,
    proveedor: contract.supplierName,
    monto: contract.amount,
    estado: contract.status,
    creadoEn: contract.createdAtUtc,
    firmadoEn: contract.signedAtUtc,
    documentoUrl: contract.documentUrl ?? null,
    formatoFirma: contract.signatureFormat ?? null,
    algoritmoFirma: contract.signatureAlgorithm ?? null,
    totalPagado: contract.totalPaid ?? 0,
    totalPenalidades: contract.totalPenalties ?? 0,
    saldoPendiente: contract.outstandingAmount ?? Math.max(0, Number(contract.amount || 0) - Number(contract.totalPaid || 0) - Number(contract.totalPenalties || 0)),
    pagos: (contract.payments ?? []).map(mapContractPayment),
  }
}

function mapContractPayment(payment) {
  return {
    id: payment.id,
    tenantId: payment.companyId,
    contratoId: payment.contractId,
    operadorId: payment.registeredById,
    operador: payment.registeredByName,
    fechaPago: payment.paymentDateUtc,
    montoPago: payment.paymentAmount,
    montoPenalidad: payment.penaltyAmount,
    diasDemora: payment.delayDays,
    notas: payment.notes ?? '',
    creadoEn: payment.createdAtUtc,
  }
}

function mapPurchaseOrder(order) {
  return {
    id: order.id,
    tenantId: order.companyId,
    procesoId: order.purchaseProcessId,
    contratoId: order.contractId,
    proveedorId: order.supplierId,
    proveedor: order.supplierName,
    numero: order.number,
    monto: order.amount,
    estado: mapEstadoOrdenCompra(order.status),
    emitidaEn: order.issuedAtUtc,
    fechaEntregaEsperada: order.expectedDeliveryDateUtc,
    observaciones: order.observations ?? '',
    documentoUrl: order.documentUrl ?? null,
    recepciones: (order.receptions ?? []).map(mapReception),
  }
}

function mapReception(reception) {
  return {
    id: reception.id,
    ordenCompraId: reception.purchaseOrderId,
    receptorId: reception.receivedById,
    receptor: reception.receivedByName,
    estado: mapEstadoRecepcion(reception.status),
    recibidaEn: reception.receivedAtUtc,
    observaciones: reception.observations ?? '',
    documentoUrl: reception.documentUrl ?? null,
    items: (reception.items ?? []).map((item) => ({
      id: item.id,
      purchaseItemId: item.purchaseItemId,
      descripcion: item.description,
      cantidadOrdenada: item.orderedQuantity,
      cantidadRecibida: item.quantityReceived,
      unidad: item.unit,
    })),
  }
}

function mapEstadoOrdenCompra(status) {
  return {
    0: 'emitida',
    1: 'parcial',
    2: 'recibida',
    3: 'cancelada',
    Issued: 'emitida',
    PartiallyReceived: 'parcial',
    Received: 'recibida',
    Cancelled: 'cancelada',
  }[status] ?? 'emitida'
}

function mapEstadoRecepcion(status) {
  return {
    0: 'aceptada',
    1: 'aceptada_observaciones',
    2: 'rechazada',
    Accepted: 'aceptada',
    AcceptedWithObservations: 'aceptada_observaciones',
    Rejected: 'rechazada',
  }[status] ?? 'aceptada'
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

export async function firmarActaEvaluacion({ tenantId, procesoId, evaluatorId, signatureImage }) {
  const data = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluation-act/sign`, {
    method: 'POST',
    body: JSON.stringify({ evaluatorId, signatureImageBase64: signatureImage }),
  })
  return mapProceso(data)
}

export function descargarActaEvaluacionUrl({ tenantId, procesoId }) {
  return `/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluation-act/pdf`
}
