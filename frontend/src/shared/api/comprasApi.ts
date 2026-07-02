import { apiFetch, ApiError } from './client'
import { ESTADO_PROCESO } from '../../domain/compras'
import type { components } from './schema'

type PurchaseProcessResponse = components["schemas"]["PurchaseProcessDto"]
type SuggestContractingModeResponse = components["schemas"]["ContractingModeDto"]
type EvaluationCriterionResponse = components["schemas"]["EvaluationCriterionDto"]
type EvaluationResultsResponse = components["schemas"]["EvaluationResultsDto"]
type AssistedAwardRecommendationResponse = components["schemas"]["AssistedAwardRecommendationDto"]
type ContractPaymentResponse = components["schemas"]["ContractPaymentDto"]
type ReceptionConfirmationResponse = components["schemas"]["ReceptionConfirmationDto"]
type SupplierInvitationResponse = components["schemas"]["InvitationDto"]

const ESTADOS_BACK_TO_FRONT: Record<string | number, string> = {
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

const ESTADOS_FRONT_TO_BACK: Record<string, string> = {
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

const ESTADOS_INVITACION: Record<string | number, string> = {
  0: 'pendiente',
  1: 'aceptada',
  2: 'rechazada',
  Pending: 'pendiente',
  Accepted: 'aceptada',
  Rejected: 'rechazada',
}

const ESTADOS_CALIFICACION: Record<string | number, string> = {
  0: 'pendiente',
  1: 'aprobado',
  2: 'observado',
  3: 'rechazado',
  Pending: 'pendiente',
  Approved: 'aprobado',
  Observed: 'observado',
  Rejected: 'rechazado',
}

export interface ListarProcesosQueryParams {
  tenantId: string
  busqueda?: string
  estado?: string
}

export interface ProcesoItemInput {
  description: string
  quantity: number | string
  unit?: string
  estimatedUnitPrice?: number | string | null
}

export interface CrearProcesoInput {
  titulo: string
  descripcion?: string
  presupuestoEstimado: number | string
  modalidadContratacionId?: string | null
  items: ProcesoItemInput[]
}

export interface ProcesoItem {
  id?: string
  purchaseProcessId?: string
  description?: string | null
  quantity?: number
  unit?: string | null
  estimatedUnitPrice?: number | null
}

export interface AwardMapped {
  id?: string
  proveedorId?: string
  proveedor?: string | null
  fecha?: string
  monto?: number
  aprobadorId?: string
  observaciones?: string | null
  actaUrl?: string | null
  documentHash?: string
  immutableHash?: string
  items?: unknown[]
}

export interface ContractPaymentMapped {
  id?: string
  tenantId?: string
  contratoId?: string
  operadorId?: string
  operador?: string | null
  fechaPago?: string
  montoPago?: number
  montoPenalidad?: number
  diasDemora?: number
  notas?: string | null
  creadoEn?: string
}

export interface ContractMapped {
  id?: string
  awardId?: string
  numero?: string | null
  proveedorId?: string
  proveedor?: string | null
  monto?: number
  estado?: string | number
  creadoEn?: string
  firmadoEn?: string | null
  documentoUrl?: string | null
  formatoFirma?: string | null
  algoritmoFirma?: string | null
  totalPagado?: number
  totalPenalidades?: number
  saldoPendiente: number
  pagos: ContractPaymentMapped[]
}

export interface PurchaseOrderMapped {
  id?: string
  tenantId?: string
  procesoId?: string
  contratoId?: string
  proveedorId?: string
  proveedor?: string | null
  numero?: string | null
  monto?: number
  estado: string
  emitidaEn?: string
  fechaEntregaEsperada?: string | null
  observaciones?: string | null
  documentoUrl?: string | null
  recepciones: ReceptionMapped[]
}

export interface ReceptionItem {
  id?: string
  purchaseItemId?: string
  descripcion?: string | null
  cantidadOrdenada?: number
  cantidadRecibida?: number
  unidad?: string | null
}

export interface ReceptionMapped {
  id?: string
  ordenCompraId?: string
  receptorId?: string
  receptor?: string | null
  estado: string
  recibidaEn?: string
  observaciones?: string | null
  documentoUrl?: string | null
  items: ReceptionItem[]
}

export interface ProcesoMapped {
  id: string
  tenantId: string
  compradorId: string
  codigo: string
  titulo: string
  descripcion?: string | null
  presupuestoEstimado: number
  modalidadContratacionId: string
  estado: string
  creadoEn?: string
  publicadoEn: string | null
  cerradoEn: string | null
  motivoRechazo: string | null
  tieneSubasta: boolean
  specificationsHash: string | null
  isEvaluationActSigned: boolean
  evaluationActHash: string | null
  evaluationActSignature: string | null
  evaluationActSignedAtUtc: string | null
  evaluationActSignedById: string | null
  evaluationActSignedByName: string | null
  evaluacion: {
    evaluadorId?: string
    recomendadoProveedor?: string | null
    observaciones?: string | null
    fecha?: string | null
  } | null
  adjudicaciones: AwardMapped[]
  adjudicacion: AwardMapped | null
  contratos: ContractMapped[]
  contrato: ContractMapped | null
  ordenesCompra: PurchaseOrderMapped[]
  ordenCompra: PurchaseOrderMapped | null
  aprobacion: null
  items: ProcesoItem[]
}

export interface InvitacionMapped {
  id: string
  procesoId: string
  proveedorId: string
  estado: string
  invitadoEn: string
  proveedor?: string | null
  cuit?: string | null
  tituloProceso?: string | null
  codigoProceso?: string | null
  rejectionReason: string | null
  calificacion: {
    estado: string
    notas: string | null
    evaluadorId: string | null
    evaluador: string | null
    fecha: string | null
  } | null
}

export interface EvaluacionResultadoMapped {
  purchaseProcessId?: string
  criteria: any[]
  supplierEvaluations: any[]
}

export interface DictamenAsistidoMapped {
  procesoId?: string
  proveedorId?: string | null
  proveedor?: string | null
  monto?: number
  ahorroMonto?: number
  ahorroPorcentaje?: number
  puntajeTecnico?: number | null
  tieneRecomendacion: boolean
  resumen?: string | null
  riesgos: Array<{ codigo: string; severidad: string; mensaje: string }>
  candidatos: Array<{
    posicion: number
    proveedorId: string
    proveedor: string
    monto: number
    ahorroMonto: number
    ahorroPorcentaje: number
    puntajeTecnico: number
    excluido: boolean
    motivoExclusion: string | null
    esPab: boolean
    cantidadLances: number
  }>
}

export async function listarProcesos({ tenantId, busqueda = '', estado = '' }: ListarProcesosQueryParams): Promise<ProcesoMapped[]> {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())
  if (estado && ESTADOS_FRONT_TO_BACK[estado]) params.set('status', ESTADOS_FRONT_TO_BACK[estado])

  const query = params.toString()
  const data = await apiFetch<PurchaseProcessResponse[] | { items: PurchaseProcessResponse[] }>(`/api/companies/${tenantId}/purchase-processes${query ? `?${query}` : ''}`)
  const items = Array.isArray(data) ? data : (data.items ?? [])
  return items.map(mapProceso)
}

export async function listarComprasRealizadas({ tenantId, busqueda = '' }: { tenantId: string; busqueda?: string }): Promise<any[]> {
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

export async function obtenerProceso({ tenantId, id }: { tenantId: string; id: string }): Promise<ProcesoMapped> {
  const data = await apiFetch<PurchaseProcessResponse>(`/api/companies/${tenantId}/purchase-processes/${id}`)
  return mapProceso(data)
}

export async function listarProcesosParaAuditoria({ tenantId, busqueda = '', estado = '' }: ListarProcesosQueryParams): Promise<ProcesoMapped[]> {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())
  if (estado && ESTADOS_FRONT_TO_BACK[estado]) params.set('status', ESTADOS_FRONT_TO_BACK[estado])

  const query = params.toString()
  const data = await apiFetch<PurchaseProcessResponse[] | { items: PurchaseProcessResponse[] }>(`/api/companies/${tenantId}/purchase-processes/audit${query ? `?${query}` : ''}`)
  const items = Array.isArray(data) ? data : (data.items ?? [])
  return items.map(mapProceso)
}

export async function obtenerProcesoParaAuditoria({ tenantId, id }: { tenantId: string; id: string }): Promise<ProcesoMapped> {
  const data = await apiFetch<PurchaseProcessResponse>(`/api/companies/${tenantId}/purchase-processes/${id}/audit`)
  return mapProceso(data)
}

export async function listarProcesosParaAprobacion({ tenantId, busqueda = '', estado = '' }: ListarProcesosQueryParams): Promise<ProcesoMapped[]> {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())
  if (estado && estado !== ESTADO_PROCESO.APROBADA && ESTADOS_FRONT_TO_BACK[estado]) {
    params.set('status', ESTADOS_FRONT_TO_BACK[estado])
  }

  const query = params.toString()
  const data = await apiFetch<PurchaseProcessResponse[] | { items: PurchaseProcessResponse[] }>(`/api/companies/${tenantId}/purchase-processes/approvals${query ? `?${query}` : ''}`)
  const items = Array.isArray(data) ? data : (data.items ?? [])
  const procesos = items.map(mapProceso)
  return estado === ESTADO_PROCESO.APROBADA
    ? procesos.filter((p) => p.estado === ESTADO_PROCESO.APROBADA)
    : procesos
}

export async function obtenerProcesoParaAprobacion({ tenantId, id }: { tenantId: string; id: string }): Promise<ProcesoMapped> {
  const data = await apiFetch<PurchaseProcessResponse>(`/api/companies/${tenantId}/purchase-processes/${id}/approval`)
  return mapProceso(data)
}

export async function sugerirModalidadContratacion({ tenantId, monto }: { tenantId: string; monto: number | string }): Promise<SuggestContractingModeResponse | null> {
  const amount = Number(monto)
  if (!Number.isFinite(amount) || amount < 0) return null

  return apiFetch<SuggestContractingModeResponse>(`/api/companies/${tenantId}/configuration/contracting-modes/suggest?amount=${amount}`)
}

export async function crearProceso({ tenantId, compradorId, datos }: { tenantId: string; compradorId: string; datos: CrearProcesoInput }): Promise<ProcesoMapped> {
  validar(datos)

  const data = await apiFetch<PurchaseProcessResponse>(`/api/companies/${tenantId}/purchase-processes`, {
    method: 'POST',
    body: {
      companyId: tenantId,
      buyerId: compradorId,
      title: datos.titulo.trim(),
      description: datos.descripcion?.trim() ?? '',
      estimatedBudget: Number(datos.presupuestoEstimado) || 0,
      contractingModeId: datos.modalidadContratacionId || null,
      items: normalizarItems(datos.items),
    },
  })

  return mapProceso(data)
}

export async function actualizarProceso({ tenantId, id, datos }: { tenantId: string; id: string; datos: CrearProcesoInput }): Promise<ProcesoMapped> {
  validar(datos)

  const data = await apiFetch<PurchaseProcessResponse>(`/api/companies/${tenantId}/purchase-processes/${id}`, {
    method: 'PUT',
    body: {
      id,
      companyId: tenantId,
      title: datos.titulo.trim(),
      description: datos.descripcion?.trim() ?? '',
      estimatedBudget: Number(datos.presupuestoEstimado) || 0,
      contractingModeId: datos.modalidadContratacionId || null,
      items: normalizarItems(datos.items),
    },
  })

  return mapProceso(data)
}

export async function publicarProceso({ tenantId, id }: { tenantId: string; id: string }): Promise<ProcesoMapped> {
  const data = await apiFetch<PurchaseProcessResponse>(`/api/companies/${tenantId}/purchase-processes/${id}/publish`, {
    method: 'POST',
  })
  return mapProceso(data)
}

export async function declararProcesoDesierto({ tenantId, id, operadorId, fundamento }: { tenantId: string; id: string; operadorId: string; fundamento: string }): Promise<ProcesoMapped> {
  if (!fundamento?.trim()) {
    throw new ApiError('Para declarar desierto hay que indicar un fundamento.', 422)
  }

  const data = await apiFetch<PurchaseProcessResponse>(`/api/companies/${tenantId}/purchase-processes/${id}/desert`, {
    method: 'POST',
    body: { operatorId: operadorId, fundamento },
  })
  return mapProceso(data)
}

export async function suspenderProcesoPorImpugnacion({ tenantId, id, operadorId, fundamento }: { tenantId: string; id: string; operadorId: string; fundamento: string }): Promise<ProcesoMapped> {
  if (!fundamento?.trim()) {
    throw new ApiError('Para suspender por impugnacion hay que indicar un fundamento.', 422)
  }

  const data = await apiFetch<PurchaseProcessResponse>(`/api/companies/${tenantId}/purchase-processes/${id}/challenge/suspend`, {
    method: 'POST',
    body: { operatorId: operadorId, fundamento },
  })
  return mapProceso(data)
}

export async function listarInvitacionesProceso({ tenantId, procesoId }: { tenantId: string; procesoId: string }): Promise<InvitacionMapped[]> {
  const data = await apiFetch<SupplierInvitationResponse[]>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/invitations`)
  return data.map(mapInvitacion)
}

export async function listarInvitacionesProcesoAudit({ tenantId, procesoId }: { tenantId: string; procesoId: string }): Promise<InvitacionMapped[]> {
  const data = await apiFetch<SupplierInvitationResponse[]>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/invitations/audit`)
  return data.map(mapInvitacion)
}

export async function invitarProveedorAProceso({ tenantId, procesoId, proveedorId }: { tenantId: string; procesoId: string; proveedorId: string }): Promise<InvitacionMapped> {
  const data = await apiFetch<SupplierInvitationResponse>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/invitations`, {
    method: 'POST',
    body: {
      companyId: tenantId,
      purchaseProcessId: procesoId,
      supplierId: proveedorId,
    },
  })
  return mapInvitacion(data)
}

export async function adjudicarProceso({ tenantId, id, compradorId, proveedor }: { tenantId: string; id: string; compradorId: string; proveedor: string }): Promise<ProcesoMapped> {
  if (!proveedor) throw new ApiError('Elegi el proveedor a adjudicar.', 422)

  await apiFetch<unknown>(`/api/companies/${tenantId}/purchase-processes/${id}/evaluate`, {
    method: 'POST',
    body: {
      evaluadorId: compradorId,
      recomendadoProveedor: proveedor,
      observaciones: 'Adjudicacion propuesta por comprador.',
    },
  })

  const data = await apiFetch<PurchaseProcessResponse>(`/api/companies/${tenantId}/purchase-processes/${id}/adjudicate`, {
    method: 'POST',
    body: { aprobadorId: compradorId },
  })

  return mapProceso(data)
}

export async function listarProcesosParaEvaluacion({ tenantId, busqueda = '' }: { tenantId: string; busqueda?: string }): Promise<ProcesoMapped[]> {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())
  params.set('status', 'Evaluation')

  const query = params.toString()
  const data = await apiFetch<PurchaseProcessResponse[] | { items: PurchaseProcessResponse[] }>(`/api/companies/${tenantId}/purchase-processes/evaluate?${query}`)
  const items = Array.isArray(data) ? data : (data.items ?? [])
  return items.map(mapProceso)
}

export async function obtenerProcesoParaEvaluacion({ tenantId, id }: { tenantId: string; id: string }): Promise<ProcesoMapped> {
  const data = await apiFetch<PurchaseProcessResponse>(`/api/companies/${tenantId}/purchase-processes/${id}/evaluate`)
  return mapProceso(data)
}

export async function obtenerCriteriosEvaluacion({ tenantId, procesoId }: { tenantId: string; procesoId: string }): Promise<any[]> {
  const data = await apiFetch<EvaluationCriterionResponse[]>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluation-criteria`)
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

export async function obtenerCriteriosEvaluacionParaEvaluador({ tenantId, procesoId }: { tenantId: string; procesoId: string }): Promise<any[]> {
  const data = await apiFetch<EvaluationCriterionResponse[]>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluation-criteria/evaluate`)
  return data.map(mapCriterioEvaluacion)
}

export async function guardarCriteriosEvaluacion({ tenantId, procesoId, userId, criteria }: { tenantId: string; procesoId: string; userId: string; criteria: any[] }): Promise<any[]> {
  const data = await apiFetch<EvaluationCriterionResponse[]>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluation-criteria`, {
    method: 'PUT',
    body: { userId, criteria },
  })
  return data.map(mapCriterioEvaluacion)
}

export async function guardarCriteriosEvaluacionParaEvaluador({ tenantId, procesoId, userId, criteria }: { tenantId: string; procesoId: string; userId: string; criteria: any[] }): Promise<any[]> {
  const data = await apiFetch<EvaluationCriterionResponse[]>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluation-criteria/evaluate`, {
    method: 'PUT',
    body: { userId, criteria },
  })
  return data.map(mapCriterioEvaluacion)
}

export async function evaluarProveedores({ tenantId, procesoId, evaluatorId, supplierEvaluations }: { tenantId: string; procesoId: string; evaluatorId: string; supplierEvaluations: any[] }): Promise<EvaluacionResultadoMapped> {
  const data = await apiFetch<EvaluationResultsResponse>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluate-suppliers`, {
    method: 'POST',
    body: { evaluatorId, supplierEvaluations },
  })
  return mapEvaluationResults(data)
}

export async function obtenerResultadosEvaluacion({ tenantId, procesoId }: { tenantId: string; procesoId: string }): Promise<EvaluacionResultadoMapped> {
  const data = await apiFetch<EvaluationResultsResponse>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluation-results`)
  return mapEvaluationResults(data)
}

export async function obtenerDictamenAsistido({ tenantId, procesoId }: { tenantId: string; procesoId: string }): Promise<DictamenAsistidoMapped> {
  const data = await apiFetch<AssistedAwardRecommendationResponse>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/award-recommendation`)
  return mapDictamenAsistido(data)
}

export async function obtenerResultadosEvaluacionParaEvaluador({ tenantId, procesoId }: { tenantId: string; procesoId: string }): Promise<EvaluacionResultadoMapped> {
  const data = await apiFetch<EvaluationResultsResponse>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluation-results/evaluate`)
  return mapEvaluationResults(data)
}

export async function obtenerResultadosEvaluacionParaAuditoria({ tenantId, procesoId }: { tenantId: string; procesoId: string }): Promise<EvaluacionResultadoMapped> {
  const data = await apiFetch<EvaluationResultsResponse>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluation-results/audit`)
  return mapEvaluationResults(data)
}

function mapCriterioEvaluacion(c: EvaluationCriterionResponse) {
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

function mapEvaluationResults(data: EvaluationResultsResponse): EvaluacionResultadoMapped {
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

function mapDictamenAsistido(data: AssistedAwardRecommendationResponse): DictamenAsistidoMapped {
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
      codigo: risk.code ?? '',
      severidad: risk.severity ?? '',
      mensaje: risk.message ?? '',
    })),
    candidatos: (data.candidates ?? []).map((candidate) => ({
      posicion: candidate.position ?? 0,
      proveedorId: candidate.supplierId ?? '',
      proveedor: candidate.supplierName ?? '',
      monto: candidate.amount ?? 0,
      ahorroMonto: candidate.savingsAmount ?? 0,
      ahorroPorcentaje: candidate.savingsPercentage ?? 0,
      puntajeTecnico: candidate.technicalScore ?? 0,
      excluido: Boolean(candidate.isExcluded),
      motivoExclusion: candidate.excludedReason ?? null,
      esPab: Boolean(candidate.isPab),
      cantidadLances: candidate.bidCount ?? 0,
    })),
  }
}

export async function aprobarAdjudicacion({ tenantId, id, autoridadId }: { tenantId: string; id: string; autoridadId: string }): Promise<ProcesoMapped> {
  const data = await apiFetch<PurchaseProcessResponse>(`/api/companies/${tenantId}/purchase-processes/${id}/approve`, {
    method: 'POST',
    body: { approverId: autoridadId },
  })
  return mapProceso(data)
}

export async function rechazarAdjudicacion({ tenantId, id, autoridadId, motivo }: { tenantId: string; id: string; autoridadId: string; motivo: string }): Promise<ProcesoMapped> {
  if (!motivo?.trim()) {
    throw new ApiError('Para rechazar hay que indicar un motivo.', 422)
  }

  const data = await apiFetch<PurchaseProcessResponse>(`/api/companies/${tenantId}/purchase-processes/${id}/reject`, {
    method: 'POST',
    body: { approverId: autoridadId, motivo },
  })
  return mapProceso(data)
}

export async function devolverAdjudicacion({ tenantId, id, autoridadId, motivo }: { tenantId: string; id: string; autoridadId: string; motivo: string }): Promise<ProcesoMapped> {
  if (!motivo?.trim()) {
    throw new ApiError('Para devolver hay que indicar un motivo.', 422)
  }

  const data = await apiFetch<PurchaseProcessResponse>(`/api/companies/${tenantId}/purchase-processes/${id}/return`, {
    method: 'POST',
    body: { approverId: autoridadId, motivo },
  })
  return mapProceso(data)
}

export interface ConfirmarRecepcionInput {
  tenantId: string
  ordenCompraId: string
  receptorId: string
  estado: string
  observaciones?: string
  items: Array<{ purchaseItemId: string; quantityReceived: number | string }>
}

export async function confirmarRecepcion({ tenantId, ordenCompraId, receptorId, estado, observaciones, items }: ConfirmarRecepcionInput): Promise<ReceptionMapped> {
  const itemsValidos = (items ?? [])
    .map((item) => ({
      purchaseItemId: item.purchaseItemId,
      quantityReceived: Number(item.quantityReceived),
    }))
    .filter((item) => item.purchaseItemId && Number.isFinite(item.quantityReceived) && item.quantityReceived > 0)

  if (itemsValidos.length === 0) {
    throw new ApiError('La recepcion debe incluir al menos un item con cantidad mayor a cero.', 422)
  }

  const data = await apiFetch<ReceptionConfirmationResponse>(`/api/companies/${tenantId}/purchase-orders/${ordenCompraId}/receptions`, {
    method: 'POST',
    body: {
      companyId: tenantId,
      purchaseOrderId: ordenCompraId,
      receivedById: receptorId,
      status: estado,
      observations: observaciones ?? '',
      items: itemsValidos,
    },
  })

  return mapReception(data)
}

export interface RegistrarPagoInput {
  tenantId: string
  contratoId: string
  operadorId: string
  fechaPago: string
  montoPago: number | string
  montoPenalidad: number | string
  diasDemora: number | string
  notas?: string
}

export async function registrarPagoContrato({
  tenantId,
  contratoId,
  operadorId,
  fechaPago,
  montoPago,
  montoPenalidad,
  diasDemora,
  notes,
}: RegistrarPagoInput & { notes?: string }): Promise<ContractPaymentMapped> {
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

  const data = await apiFetch<ContractPaymentResponse>(`/api/companies/${tenantId}/contracts/${contratoId}/payments`, {
    method: 'POST',
    body: {
      companyId: tenantId,
      contractId: contratoId,
      registeredById: operadorId,
      paymentDateUtc: fechaPago ? new Date(`${fechaPago}T00:00:00`).toISOString() : null,
      paymentAmount,
      penaltyAmount,
      delayDays,
      notes: notes ?? '',
    },
  })

  return mapContractPayment(data)
}

function mapProceso(p: PurchaseProcessResponse): ProcesoMapped {
  const adjudicaciones = (p.awards ?? []).map(mapAward)
  const adjudicacion = p.award ? mapAward(p.award) : (adjudicaciones[0] ?? null)
  const ordenesCompra = (p.purchaseOrders ?? []).map(mapPurchaseOrder)
  const ordenCompra = p.purchaseOrder ? mapPurchaseOrder(p.purchaseOrder) : (ordenesCompra[0] ?? null)
  const estado = mapEstadoProceso(p.status, adjudicaciones)

  return {
    id: p.id ?? '',
    tenantId: p.companyId ?? '',
    compradorId: p.buyerId ?? '',
    codigo: p.code ?? '',
    titulo: p.title ?? '',
    descripcion: p.description,
    presupuestoEstimado: p.estimatedBudget ?? 0,
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
      evaluadorId: p.evaluation.evaluatorId,
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
    items: (p.items ?? []).map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      estimatedUnitPrice: item.estimatedUnitPrice
    })),
  }
}

function mapEstadoProceso(status?: string | number, adjudicaciones: AwardMapped[] = []): string {
  const estadoBase = ESTADOS_BACK_TO_FRONT[status ?? ''] ?? ESTADO_PROCESO.BORRADOR
  const aprobadoConAdjudicacion =
    estadoBase === ESTADO_PROCESO.PUBLICADO && adjudicaciones.length > 0

  return aprobadoConAdjudicacion ? ESTADO_PROCESO.APROBADA : estadoBase
}

function mapAward(award: any): AwardMapped {
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

function mapContract(contract: any): ContractMapped {
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

function mapContractPayment(payment: any): ContractPaymentMapped {
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

function mapPurchaseOrder(order: any): PurchaseOrderMapped {
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

function mapReception(reception: any): ReceptionMapped {
  return {
    id: reception.id,
    ordenCompraId: reception.purchaseOrderId,
    receptorId: reception.receivedById,
    receptor: reception.receivedByName,
    estado: mapEstadoRecepcion(reception.status),
    recibidaEn: reception.receivedAtUtc,
    observaciones: reception.observations ?? '',
    documentoUrl: reception.documentUrl ?? null,
    items: (reception.items ?? []).map((item: any) => ({
      id: item.id,
      purchaseItemId: item.purchaseItemId,
      descripcion: item.description,
      cantidadOrdenada: item.orderedQuantity,
      cantidadRecibida: item.quantityReceived,
      unit: item.unit,
    })),
  }
}

function mapEstadoOrdenCompra(status?: string | number): string {
  const map: Record<string | number, string> = {
    0: 'emitida',
    1: 'parcial',
    2: 'recibida',
    3: 'cancelada',
    Issued: 'emitida',
    PartiallyReceived: 'parcial',
    Received: 'recibida',
    Cancelled: 'cancelada',
  }
  return map[status ?? ''] ?? 'emitida'
}

function mapEstadoRecepcion(status?: string | number): string {
  const map: Record<string | number, string> = {
    0: 'aceptada',
    1: 'aceptada_observaciones',
    2: 'rechazada',
    Accepted: 'aceptada',
    AcceptedWithObservations: 'aceptada_observaciones',
    Rejected: 'rechazada',
  }
  return map[status ?? ''] ?? 'aceptada'
}

function mapInvitacion(invitation: any): InvitacionMapped {
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

function mapCalificacion(inv: any) {
  return {
    estado: ESTADOS_CALIFICACION[inv.qualificationStatus] ?? 'pendiente',
    notas: inv.qualificationNotes ?? null,
    evaluadorId: inv.qualifiedById ?? null,
    evaluador: inv.qualifiedByName ?? null,
    fecha: inv.qualifiedAtUtc ?? null,
  }
}

export async function listarProcesosParaCalificacion({ tenantId, busqueda = '' }: { tenantId: string; busqueda?: string }): Promise<ProcesoMapped[]> {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())

  const query = params.toString()
  const data = await apiFetch<PurchaseProcessResponse[] | { items: PurchaseProcessResponse[] }>(`/api/companies/${tenantId}/purchase-processes/qualification${query ? `?${query}` : ''}`)
  const items = Array.isArray(data) ? data : (data.items ?? [])
  return items.map(mapProceso)
}

export async function obtenerProveedoresDeProceso({ tenantId, procesoId }: { tenantId: string; procesoId: string }): Promise<any[]> {
  const data = await apiFetch<any[]>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/suppliers`)
  return data.map(s => ({
    invitationId: s.invitationId,
    supplierId: s.supplierId,
    businessName: s.businessName,
    cuit: s.cuit,
    calificacion: s.qualificationStatus
      ? {
          estado: ESTADOS_CALIFICACION[s.qualificationStatus] ?? 'pendiente',
          notes: s.qualificationNotes ?? null,
          evaluadorId: s.qualifiedById ?? null,
          evaluador: s.qualifiedByName ?? null,
          fecha: s.qualifiedAtUtc ?? null,
        }
      : null,
  }))
}

export async function calificarProveedor({ tenantId, procesoId, invitationId, evaluatorId, qualificationStatus, notes }: { tenantId: string; procesoId: string; invitationId: string; evaluatorId: string; qualificationStatus: string | number; notes: string }): Promise<any> {
  const data = await apiFetch<any>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/invitations/${invitationId}/qualify`, {
    method: 'POST',
    body: { evaluatorId, qualificationStatus, notes },
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

function validar(datos: CrearProcesoInput) {
  if (!datos.titulo?.trim()) throw new ApiError('El titulo es obligatorio.', 422)
  if (datos.presupuestoEstimado && Number(datos.presupuestoEstimado) < 0) {
    throw new ApiError('El presupuesto no puede ser negativo.', 422)
  }
}

function normalizarItems(items: ProcesoItemInput[] = []) {
  return items
    .filter((item) => item.description?.trim())
    .map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity) || 1,
      unit: item.unit?.trim() || 'unidad',
      estimatedUnitPrice: item.estimatedUnitPrice ? Number(item.estimatedUnitPrice) : null,
    }))
}

export async function firmarActaEvaluacion({ tenantId, procesoId, evaluatorId, signatureImage }: { tenantId: string; procesoId: string; evaluatorId: string; signatureImage: string }): Promise<ProcesoMapped> {
  const data = await apiFetch<PurchaseProcessResponse>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluation-act/sign`, {
    method: 'POST',
    body: { evaluatorId, signatureImageBase64: signatureImage },
  })
  return mapProceso(data)
}

export function descargarActaEvaluacionUrl({ tenantId, procesoId }: { tenantId: string; procesoId: string }): string {
  return `/api/companies/${tenantId}/purchase-processes/${procesoId}/evaluation-act/pdf`
}
