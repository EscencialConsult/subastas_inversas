import { apiFetch, ApiError } from './client'
import type { components } from './schema'

type SupplierResponse = components["schemas"]["SupplierDto"]
type SupplierDocumentResponse = components["schemas"]["SupplierDocumentDto"]
type SupplierDocumentReviewResponse = components["schemas"]["SupplierDocumentReviewDto"]
type SupplierInvitationResponse = components["schemas"]["InvitationDto"]
type AuctionDtoResponse = components["schemas"]["SupplierAuctionDto"]
type BidDtoResponse = components["schemas"]["BidDto"]
type CompanySupplierDtoResponse = components["schemas"]["CompanySupplierDto"]

const ESTADOS: Record<string | number, string> = {
  0: 'pendiente',
  1: 'verificado',
  2: 'rechazado',
  Pending: 'pendiente',
  Verified: 'verificado',
  Rejected: 'rechazado',
}

const ESTADOS_DOCUMENTO: Record<string | number, string> = {
  0: 'valido',
  1: 'por_vencer',
  2: 'vencido',
  Valid: 'valido',
  ExpiringSoon: 'por_vencer',
  Expired: 'vencido',
}

const ESTADOS_ARCA: Record<string | number, string> = {
  0: 'pendiente',
  1: 'verificado',
  2: 'rechazado',
  3: 'fallido',
  Pending: 'pendiente',
  Verified: 'verificado',
  Rejected: 'rechazado',
  Failed: 'fallido',
}

const ESTADOS_EMPRESA_PROVEEDOR: Record<string | number, string> = {
  0: 'habilitado',
  1: 'habilitado_con_alerta',
  2: 'bloqueado',
  Enabled: 'habilitado',
  EnabledWithWarning: 'habilitado_con_alerta',
  Blocked: 'bloqueado',
}

const VEREDICTOS_DOCUMENTO: Record<string | number, string> = {
  0: 'aprobado',
  1: 'rechazado',
  2: 'aprobado_con_excepcion',
  Approved: 'aprobado',
  Rejected: 'rechazado',
  ApprovedWithException: 'aprobado_con_excepcion',
}

const ESTADOS_INVITACION: Record<string | number, string> = {
  0: 'pendiente',
  1: 'aceptada',
  2: 'rechazada',
  Pending: 'pendiente',
  Accepted: 'aceptada',
  Rejected: 'rechazada',
}

const ESTADOS_SUBASTA: Record<string | number, string> = {
  0: 'Open',
  1: 'Closed',
  2: 'Scheduled',
  Open: 'Open',
  Closed: 'Closed',
  Scheduled: 'Scheduled',
}

export interface RegistrarProveedorInput {
  razonSocial: string
  cuit: string
  email: string
  rubro: string
  provincia?: string
  localidad?: string
}

export interface ProveedorMapped {
  id: string
  usuarioId: string
  razonSocial: string
  cuit: string
  email: string
  rubro: string
  provincia: string
  localidad: string
  estado: string
  arcaVerificado: boolean
  estadoArca: string
  verificadoArcaEn: string | null
  notasArca: string
  credencialesEnviadasEn: string | null
  estadoEmpresa: string
  advertenciaEmpresa: string
  politicaEstricta?: boolean | null
}

export interface ListarProveedoresQueryParams {
  busqueda?: string
  estado?: string
  rubro?: string
  provincia?: string
  localidad?: string
  cercania?: string
  tenantId?: string | null
}

export interface DocumentoProveedorMapped {
  id: string
  proveedorId: string
  tipo: number
  nombreArchivo: string
  contentType: string
  ruta: string
  fechaCarga: string
  venceEl: string
  sha256Hash: string
  hashCorto: string
  estado: string
  alertaRegistradaEl?: string | null
  dictamen: string | null
  dictaminadoEl?: string | null
  revisiones: RevisionDocumentoMapped[]
}

export interface RevisionDocumentoMapped {
  id: string
  documentoId: string
  revisorId: string
  accion: number
  dictamen: string | null
  notas?: string | null
  excepcion?: string | null
  fecha: string
}

export interface InvitacionProveedorMapped {
  id: string
  procesoId: string
  proveedorId: string
  estado: string
  invitadoEn: string
  tituloProceso: string
  codigoProceso: string
  rejectionReason: string | null
}

export interface SubastaProveedorMapped {
  id: string
  procesoId: string
  tenantId: string
  codigo: string
  titulo: string
  precioBase: number
  precioActual: number
  decrementoMinimo: number
  autoExtensionMinutes: number
  pabThreshold: number
  inicioISO: string
  finISO: string
  estado: string
  participantes: string[]
  lances: LanceMapped[]
}

export interface LanceMapped {
  id: string
  subastaId: string
  proveedorId: string
  proveedor: string
  monto: number
  fechaServidor: string
  hace: string
  isPab: boolean
  subastaFinISO: string | null
  subastaExtendida: boolean
  secuencia: number
  hashPrevio: string
  hash: string
}

export interface HabilitarProveedorEmpresaMapped {
  id: string
  tenantId: string
  proveedorId: string
  estadoEmpresa: string
  advertenciaEmpresa: string
  politicaEstricta: boolean
}

export async function registrarProveedor({ datos }: { datos: RegistrarProveedorInput }): Promise<string> {
  validar(datos)

  return apiFetch<string>('/api/suppliers/register', {
    method: 'POST',
    body: {
      businessName: datos.razonSocial.trim(),
      cuit: datos.cuit.trim(),
      email: datos.email.trim(),
      businessCategory: datos.rubro.trim(),
      province: datos.provincia?.trim() || 'Sin informar',
      locality: datos.localidad?.trim() || 'Sin informar',
    },
  })
}

export async function obtenerProveedorDeUsuario({ usuarioId }: { usuarioId: string }): Promise<ProveedorMapped> {
  const proveedor = await apiFetch<SupplierResponse>(`/api/suppliers/by-user/${usuarioId}`)
  return mapProveedor(proveedor)
}

export async function listarProveedores(filters: ListarProveedoresQueryParams = {}): Promise<ProveedorMapped[]> {
  return listarProveedoresDesdeEndpoint('/api/suppliers', filters)
}

export async function listarProveedoresParaEvaluacion(filters: ListarProveedoresQueryParams = {}): Promise<ProveedorMapped[]> {
  return listarProveedoresDesdeEndpoint('/api/evaluation/suppliers', filters)
}

export async function listarProveedoresParaAuditoria(filters: ListarProveedoresQueryParams = {}): Promise<ProveedorMapped[]> {
  return listarProveedoresDesdeEndpoint('/api/audit/suppliers', filters)
}

async function listarProveedoresDesdeEndpoint(
  endpoint: string,
  { busqueda = '', estado = '', rubro = '', provincia = '', localidad = '', cercania = '', tenantId = null }: ListarProveedoresQueryParams = {},
): Promise<ProveedorMapped[]> {
  const params = new URLSearchParams()
  if (tenantId) params.set('companyId', tenantId)
  if (busqueda.trim()) params.set('search', busqueda.trim())
  if (rubro.trim()) params.set('rubro', rubro.trim())
  if (provincia.trim()) params.set('province', provincia.trim())
  if (localidad.trim()) params.set('locality', localidad.trim())
  if (cercania) params.set('proximity', cercania)

  const query = params.toString() ? `?${params}` : ''
  const data = await apiFetch<SupplierResponse[] | { items: SupplierResponse[] }>(`${endpoint}${query}`)
  const items = Array.isArray(data) ? data : (data.items ?? [])
  let resultado = items.map(mapProveedor)

  if (estado) resultado = resultado.filter((p) => p.estado === estado)

  return resultado
}

export async function habilitarProveedorEmpresa({ tenantId, proveedorId }: { tenantId: string; proveedorId: string }): Promise<HabilitarProveedorEmpresaMapped> {
  const data = await apiFetch<CompanySupplierDtoResponse>(`/api/companies/${tenantId}/suppliers/${proveedorId}/enable`, {
    method: 'POST',
  })

  return {
    id: data.id ?? '',
    tenantId: data.companyId ?? '',
    proveedorId: data.supplierId ?? '',
    estadoEmpresa: ESTADOS_EMPRESA_PROVEEDOR[data.status ?? ''] ?? 'sin_habilitar',
    advertenciaEmpresa: data.warningMessage ?? '',
    politicaEstricta: Boolean(data.strictPolicyApplied),
  }
}

export async function listarInvitacionesDeProveedor({ proveedorId }: { proveedorId: string }): Promise<InvitacionProveedorMapped[]> {
  const data = await apiFetch<SupplierInvitationResponse[]>(`/api/suppliers/${proveedorId}/invitations`)
  return data.map(mapInvitacionProveedor)
}

export async function listarDocumentosProveedor({ proveedorId }: { proveedorId: string }): Promise<DocumentoProveedorMapped[]> {
  const data = await apiFetch<SupplierDocumentResponse[]>(`/api/suppliers/${proveedorId}/documents`)
  return data.map(mapDocumentoProveedor)
}

export async function subirDocumentoProveedor({ proveedorId, tipo, archivo, venceEl }: { proveedorId: string; tipo: number | string; archivo: File; venceEl: string }): Promise<DocumentoProveedorMapped> {
  const formData = new FormData()
  formData.append('type', String(tipo))
  formData.append('expiresAtUtc', new Date(`${venceEl}T23:59:59.000Z`).toISOString())
  formData.append('file', archivo)

  const data = await apiFetch<SupplierDocumentResponse>(`/api/suppliers/${proveedorId}/documents`, {
    method: 'POST',
    body: formData,
  })

  return mapDocumentoProveedor(data)
}

export async function subsanarDocumentoProveedor({ documentoId, proveedorId, notes }: { documentoId: string; proveedorId: string; notes: string }): Promise<RevisionDocumentoMapped> {
  const data = await apiFetch<SupplierDocumentReviewResponse>(`/api/suppliers/documents/${documentoId}/remediations`, {
    method: 'POST',
    body: {
      documentId: documentoId,
      supplierId: proveedorId,
      notes: notes,
    },
  })
  return mapRevisionDocumento(data)
}

export async function observarDocumentoProveedor({ documentoId, evaluadorId, notas }: { documentoId: string; evaluadorId: string; notas: string }): Promise<RevisionDocumentoMapped> {
  const data = await apiFetch<SupplierDocumentReviewResponse>(`/api/suppliers/documents/${documentoId}/observations`, {
    method: 'POST',
    body: {
      documentId: documentoId,
      evaluatorId: evaluadorId,
      notes: notas,
    },
  })
  return mapRevisionDocumento(data)
}

export async function dictaminarDocumentoProveedor({
  documentoId,
  evaluadorId,
  dictamen,
  notas,
  excepcion,
}: {
  documentoId: string
  evaluadorId: string
  dictamen: number | string
  notas: string
  excepcion?: string
}): Promise<RevisionDocumentoMapped> {
  const data = await apiFetch<SupplierDocumentReviewResponse>(`/api/suppliers/documents/${documentoId}/verdicts`, {
    method: 'POST',
    body: {
      documentId: documentoId,
      evaluatorId: evaluadorId,
      verdict: Number(dictamen),
      notes: notas,
      exceptionReason: excepcion || null,
    },
  })
  return mapRevisionDocumento(data)
}

export async function responderInvitacion({ invitacionId, proveedorId, aceptar, rejectionReason }: { invitacionId: string; proveedorId: string; aceptar: boolean; rejectionReason?: string }): Promise<InvitacionProveedorMapped> {
  const data = await apiFetch<SupplierInvitationResponse>(`/api/suppliers/invitations/${invitacionId}/respond`, {
    method: 'PATCH',
    body: {
      invitationId: invitacionId,
      supplierId: proveedorId,
      newStatus: aceptar ? 1 : 2,
      rejectionReason: rejectionReason || null,
    },
  })
  return mapInvitacionProveedor(data)
}

export async function listarSubastasProveedor({ proveedorId }: { proveedorId: string }): Promise<SubastaProveedorMapped[]> {
  const data = await apiFetch<AuctionDtoResponse[]>(`/api/suppliers/${proveedorId}/auctions`)
  return data.map(mapSubastaProveedor)
}

export async function obtenerSubastaProveedor({ proveedorId, auctionId }: { proveedorId: string; auctionId: string }): Promise<SubastaProveedorMapped> {
  const data = await apiFetch<AuctionDtoResponse>(`/api/suppliers/${proveedorId}/auctions/${auctionId}`)
  return mapSubastaProveedor(data)
}

export async function realizarLance({ tenantId, auctionId, supplierId, monto }: { tenantId: string; auctionId: string; supplierId: string; monto: number }): Promise<LanceMapped> {
  const data = await apiFetch<BidDtoResponse>(`/api/companies/${tenantId}/auctions/${auctionId}/bids`, {
    method: 'POST',
    body: {
      auctionId,
      supplierId,
      amount: monto,
    },
  })
  return mapLance(data)
}

function mapSubastaProveedor(data: AuctionDtoResponse): SubastaProveedorMapped {
  return {
    id: data.auctionId ?? '',
    procesoId: data.purchaseProcessId ?? '',
    tenantId: data.companyId ?? '',
    codigo: data.processCode ?? '',
    titulo: data.processTitle ?? '',
    precioBase: data.basePrice ?? 0,
    precioActual: data.currentPrice ?? 0,
    decrementoMinimo: data.minimumDecrementPercentage ?? 0,
    autoExtensionMinutes: data.autoExtensionMinutes ?? 0,
    pabThreshold: data.pabThreshold ?? 0,
    inicioISO: data.startsAtUtc ?? '',
    finISO: data.endsAtUtc ?? '',
    estado: ESTADOS_SUBASTA[String(data.status ?? '')] ?? String(data.status ?? ''),
    participantes: data.participantSupplierIds ?? [],
    lances: (data.bids ?? []).map(mapLance),
  }
}

function mapLance(bid: BidDtoResponse): LanceMapped {
  return {
    id: bid.id ?? '',
    subastaId: bid.auctionId ?? '',
    proveedorId: bid.supplierId ?? '',
    proveedor: bid.supplierName ?? '',
    monto: bid.amount ?? 0,
    fechaServidor: bid.placedAtUtc ?? '',
    hace: formatearHace(bid.placedAtUtc),
    isPab: Boolean(bid.isPab),
    subastaFinISO: bid.auctionEndsAtUtc ?? null,
    subastaExtendida: Boolean(bid.auctionExtended),
    secuencia: bid.sequenceNumber ?? 0,
    hashPrevio: bid.previousHash ?? '',
    hash: bid.hash ?? '',
  }
}

function mapProveedor(proveedor: SupplierResponse): ProveedorMapped {
  return {
    id: proveedor.id ?? '',
    usuarioId: proveedor.userId ?? '',
    razonSocial: proveedor.businessName ?? '',
    cuit: proveedor.cuit ?? '',
    email: proveedor.email ?? '',
    provincia: proveedor.province ?? '',
    localidad: proveedor.locality ?? '',
    estado: ESTADOS[proveedor.status ?? ''] ?? 'pendiente',
    rubro: proveedor.businessCategory ?? '---',
    arcaVerificado: Boolean(proveedor.arcaVerified),
    estadoArca: ESTADOS_ARCA[proveedor.arcaVerificationStatus ?? ''] ?? 'pendiente',
    verificadoArcaEn: proveedor.arcaVerifiedAtUtc ?? null,
    notasArca: proveedor.arcaVerificationNotes ?? '',
    credencialesEnviadasEn: proveedor.credentialsSentAtUtc ?? null,
    estadoEmpresa: ESTADOS_EMPRESA_PROVEEDOR[proveedor.companySupplierStatus ?? ''] ?? 'sin_habilitar',
    advertenciaEmpresa: proveedor.companySupplierWarning ?? '',
    politicaEstricta: proveedor.companySupplierStrictPolicy,
  }
}

function mapDocumentoProveedor(data: SupplierDocumentResponse): DocumentoProveedorMapped {
  return {
    id: data.id ?? '',
    proveedorId: data.supplierId ?? '',
    tipo: data.type ?? 0,
    nombreArchivo: data.fileName ?? '',
    contentType: data.contentType ?? '',
    ruta: data.storagePath ?? '',
    fechaCarga: data.uploadedAtUtc ?? '',
    venceEl: data.expiresAtUtc ?? '',
    sha256Hash: data.sha256Hash ?? '',
    hashCorto: data.sha256Hash ? `${data.sha256Hash.slice(0, 12)}...` : '---',
    estado: ESTADOS_DOCUMENTO[data.status ?? ''] ?? 'valido',
    alertaRegistradaEl: data.alertSentAtUtc,
    dictamen: VEREDICTOS_DOCUMENTO[data.verdict ?? ''] ?? null,
    dictaminadoEl: data.verdictIssuedAtUtc,
    revisiones: (data.reviews ?? []).map(mapRevisionDocumento),
  }
}

function mapRevisionDocumento(review: SupplierDocumentReviewResponse): RevisionDocumentoMapped {
  return {
    id: review.id ?? '',
    documentoId: review.supplierDocumentId ?? '',
    revisorId: review.reviewerId ?? '',
    accion: review.action ?? 0,
    dictamen: VEREDICTOS_DOCUMENTO[review.verdict ?? ''] ?? null,
    notas: review.notes,
    excepcion: review.exceptionReason,
    fecha: review.createdAtUtc ?? '',
  }
}

function mapInvitacionProveedor(data: SupplierInvitationResponse): InvitacionProveedorMapped {
  return {
    id: data.id ?? '',
    procesoId: data.purchaseProcessId ?? '',
    proveedorId: data.supplierId ?? '',
    estado: ESTADOS_INVITACION[data.status ?? ''] ?? 'pendiente',
    invitadoEn: data.invitedAtUtc ?? '',
    tituloProceso: data.processTitle ?? '',
    codigoProceso: data.processCode ?? '',
    rejectionReason: data.rejectionReason ?? null,
  }
}

function formatearHace(fechaIso?: string | null): string {
  if (!fechaIso) return '—'
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(fechaIso))
}

function validar(datos: RegistrarProveedorInput) {
  if (!datos.razonSocial?.trim()) {
    throw new ApiError('La razon social es obligatoria.', 422)
  }
  if (!datos.cuit?.trim()) throw new ApiError('El CUIT es obligatorio.', 422)
  if (!/^\d{2}-?\d{8}-?\d$/.test(datos.cuit.trim())) {
    throw new ApiError('El CUIT no tiene un formato valido (ej: 30-12345678-1).', 422)
  }
  if (!datos.email?.trim()) throw new ApiError('El email es obligatorio.', 422)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) {
    throw new ApiError('El email no tiene un formato valido.', 422)
  }
  if (!datos.rubro?.trim()) throw new ApiError('El rubro es obligatorio.', 422)
}
