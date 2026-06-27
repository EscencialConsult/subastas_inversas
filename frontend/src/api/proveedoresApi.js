import { apiFetch, ApiError } from './client.js'

const ESTADOS = {
  0: 'pendiente',
  1: 'verificado',
  2: 'rechazado',
  Pending: 'pendiente',
  Verified: 'verificado',
  Rejected: 'rechazado',
}

const ESTADOS_DOCUMENTO = {
  0: 'valido',
  1: 'por_vencer',
  2: 'vencido',
  Valid: 'valido',
  ExpiringSoon: 'por_vencer',
  Expired: 'vencido',
}

const ESTADOS_ARCA = {
  0: 'pendiente',
  1: 'verificado',
  2: 'rechazado',
  3: 'fallido',
  Pending: 'pendiente',
  Verified: 'verificado',
  Rejected: 'rechazado',
  Failed: 'fallido',
}

const ESTADOS_EMPRESA_PROVEEDOR = {
  0: 'habilitado',
  1: 'habilitado_con_alerta',
  2: 'bloqueado',
  Enabled: 'habilitado',
  EnabledWithWarning: 'habilitado_con_alerta',
  Blocked: 'bloqueado',
}

const VEREDICTOS_DOCUMENTO = {
  0: 'aprobado',
  1: 'rechazado',
  2: 'aprobado_con_excepcion',
  Approved: 'aprobado',
  Rejected: 'rechazado',
  ApprovedWithException: 'aprobado_con_excepcion',
}

const ESTADOS_INVITACION = {
  0: 'pendiente',
  1: 'aceptada',
  2: 'rechazada',
  Pending: 'pendiente',
  Accepted: 'aceptada',
  Rejected: 'rechazada',
}

const ESTADOS_SUBASTA = {
  0: 'Open',
  1: 'Closed',
  2: 'Scheduled',
  Open: 'Open',
  Closed: 'Closed',
  Scheduled: 'Scheduled',
}

export async function registrarProveedor({ datos }) {
  validar(datos)

  return apiFetch('/api/suppliers/register', {
    method: 'POST',
    body: JSON.stringify({
      businessName: datos.razonSocial.trim(),
      cuit: datos.cuit.trim(),
      email: datos.email.trim(),
      businessCategory: datos.rubro.trim(),
      province: datos.provincia?.trim() || 'Sin informar',
      locality: datos.localidad?.trim() || 'Sin informar',
    }),
  })
}

export async function obtenerProveedorDeUsuario({ usuarioId }) {
  const proveedor = await apiFetch(`/api/suppliers/by-user/${usuarioId}`)

  return {
    id: proveedor.id,
    usuarioId: proveedor.userId,
    razonSocial: proveedor.businessName,
    cuit: proveedor.cuit,
    email: proveedor.email,
    rubro: proveedor.businessCategory,
    provincia: proveedor.province,
    localidad: proveedor.locality,
    estado: ESTADOS[proveedor.status] ?? 'pendiente',
    arcaVerificado: proveedor.arcaVerified,
    estadoArca: ESTADOS_ARCA[proveedor.arcaVerificationStatus] ?? 'pendiente',
    verificadoArcaEn: proveedor.arcaVerifiedAtUtc ?? null,
    notasArca: proveedor.arcaVerificationNotes ?? '',
    credencialesEnviadasEn: proveedor.credentialsSentAtUtc ?? null,
  }
}

export async function listarProveedores({
  busqueda = '',
  estado = '',
  rubro = '',
  provincia = '',
  localidad = '',
  cercania = '',
  tenantId = null,
} = {}) {
  return listarProveedoresDesdeEndpoint('/api/suppliers', {
    busqueda,
    estado,
    rubro,
    provincia,
    localidad,
    cercania,
    tenantId,
  })
}

export async function listarProveedoresParaEvaluacion({
  busqueda = '',
  estado = '',
  rubro = '',
  provincia = '',
  localidad = '',
  cercania = '',
  tenantId = null,
} = {}) {
  return listarProveedoresDesdeEndpoint('/api/evaluation/suppliers', {
    busqueda,
    estado,
    rubro,
    provincia,
    localidad,
    cercania,
    tenantId,
  })
}

export async function listarProveedoresParaAuditoria({
  busqueda = '',
  estado = '',
  rubro = '',
  provincia = '',
  localidad = '',
  cercania = '',
  tenantId = null,
} = {}) {
  return listarProveedoresDesdeEndpoint('/api/audit/suppliers', {
    busqueda,
    estado,
    rubro,
    provincia,
    localidad,
    cercania,
    tenantId,
  })
}

async function listarProveedoresDesdeEndpoint(
  endpoint,
  { busqueda = '', estado = '', rubro = '', provincia = '', localidad = '', cercania = '', tenantId = null } = {},
) {
  const params = new URLSearchParams()
  if (tenantId) params.set('companyId', tenantId)
  if (busqueda.trim()) params.set('search', busqueda.trim())
  if (rubro.trim()) params.set('rubro', rubro.trim())
  if (provincia.trim()) params.set('province', provincia.trim())
  if (localidad.trim()) params.set('locality', localidad.trim())
  if (cercania) params.set('proximity', cercania)

  const query = params.toString() ? `?${params}` : ''
  const data = await apiFetch(`${endpoint}${query}`)
  const items = Array.isArray(data) ? data : (data.items ?? [])
  let resultado = items.map(mapProveedor)

  if (estado) resultado = resultado.filter((p) => p.estado === estado)

  return resultado
}

export async function habilitarProveedorEmpresa({ tenantId, proveedorId }) {
  const data = await apiFetch(`/api/companies/${tenantId}/suppliers/${proveedorId}/enable`, {
    method: 'POST',
  })

  return {
    id: data.id,
    tenantId: data.companyId,
    proveedorId: data.supplierId,
    estadoEmpresa: ESTADOS_EMPRESA_PROVEEDOR[data.status] ?? 'sin_habilitar',
    advertenciaEmpresa: data.warningMessage ?? '',
    politicaEstricta: data.strictPolicyApplied,
  }
}

export async function listarInvitacionesDeProveedor({ proveedorId }) {
  const data = await apiFetch(`/api/suppliers/${proveedorId}/invitations`)
  return data.map(mapInvitacionProveedor)
}

export async function listarDocumentosProveedor({ proveedorId }) {
  const data = await apiFetch(`/api/suppliers/${proveedorId}/documents`)
  return data.map(mapDocumentoProveedor)
}

export async function subirDocumentoProveedor({ proveedorId, tipo, archivo, venceEl }) {
  const formData = new FormData()
  formData.append('type', tipo)
  formData.append('expiresAtUtc', new Date(`${venceEl}T23:59:59.000Z`).toISOString())
  formData.append('file', archivo)

  const data = await apiFetch(`/api/suppliers/${proveedorId}/documents`, {
    method: 'POST',
    body: formData,
  })

  return mapDocumentoProveedor(data)
}

export async function subsanarDocumentoProveedor({ documentoId, proveedorId, notas }) {
  return apiFetch(`/api/suppliers/documents/${documentoId}/remediations`, {
    method: 'POST',
    body: JSON.stringify({
      documentId: documentoId,
      supplierId: proveedorId,
      notes: notas,
    }),
  })
}

export async function observarDocumentoProveedor({ documentoId, evaluadorId, notas }) {
  const data = await apiFetch(`/api/suppliers/documents/${documentoId}/observations`, {
    method: 'POST',
    body: JSON.stringify({
      documentId: documentoId,
      evaluatorId: evaluadorId,
      notes: notas,
    }),
  })
  return mapRevisionDocumento(data)
}

export async function dictaminarDocumentoProveedor({
  documentoId,
  evaluadorId,
  dictamen,
  notas,
  excepcion,
}) {
  const data = await apiFetch(`/api/suppliers/documents/${documentoId}/verdicts`, {
    method: 'POST',
    body: JSON.stringify({
      documentId: documentoId,
      evaluatorId: evaluadorId,
      verdict: Number(dictamen),
      notes: notas,
      exceptionReason: excepcion || null,
    }),
  })
  return mapRevisionDocumento(data)
}

export async function responderInvitacion({ invitacionId, proveedorId, aceptar, rejectionReason }) {
  const data = await apiFetch(`/api/suppliers/invitations/${invitacionId}/respond`, {
    method: 'PATCH',
    body: JSON.stringify({
      invitationId: invitacionId,
      supplierId: proveedorId,
      newStatus: aceptar ? 1 : 2,
      rejectionReason: rejectionReason || null,
    }),
  })
  return mapInvitacionProveedor(data)
}

export async function listarSubastasProveedor({ proveedorId }) {
  const data = await apiFetch(`/api/suppliers/${proveedorId}/auctions`)
  return data.map(mapSubastaProveedor)
}

export async function obtenerSubastaProveedor({ proveedorId, auctionId }) {
  const data = await apiFetch(`/api/suppliers/${proveedorId}/auctions/${auctionId}`)
  return mapSubastaProveedor(data)
}

export async function realizarLance({ tenantId, auctionId, supplierId, monto }) {
  const data = await apiFetch(`/api/companies/${tenantId}/auctions/${auctionId}/bids`, {
    method: 'POST',
    body: JSON.stringify({
      auctionId,
      supplierId,
      amount: monto,
    }),
  })
  return mapLance(data)
}

function mapSubastaProveedor(data) {
  return {
    id: data.auctionId,
    procesoId: data.purchaseProcessId,
    tenantId: data.companyId,
    codigo: data.processCode,
    titulo: data.processTitle,
    precioBase: data.basePrice,
    precioActual: data.currentPrice,
    decrementoMinimo: data.minimumDecrementPercentage,
    autoExtensionMinutes: data.autoExtensionMinutes,
    pabThreshold: data.pabThreshold,
    inicioISO: data.startsAtUtc,
    finISO: data.endsAtUtc,
    estado: ESTADOS_SUBASTA[data.status] ?? data.status,
    participantes: data.participantSupplierIds ?? [],
    lances: (data.bids ?? []).map(mapLance),
  }
}

function mapLance(bid) {
  return {
    id: bid.id,
    subastaId: bid.auctionId,
    proveedorId: bid.supplierId,
    proveedor: bid.supplierName,
    monto: bid.amount,
    fechaServidor: bid.placedAtUtc,
    hace: formatearHace(bid.placedAtUtc),
    isPab: Boolean(bid.isPab),
    secuencia: bid.sequenceNumber ?? 0,
    hashPrevio: bid.previousHash ?? '',
    hash: bid.hash ?? '',
  }
}

function mapProveedor(proveedor) {
  return {
    id: proveedor.id,
    usuarioId: proveedor.userId,
    razonSocial: proveedor.businessName,
    cuit: proveedor.cuit,
    email: proveedor.email,
    provincia: proveedor.province,
    localidad: proveedor.locality,
    estado: ESTADOS[proveedor.status] ?? 'pendiente',
    rubro: proveedor.businessCategory ?? '---',
    arcaVerificado: proveedor.arcaVerified,
    estadoArca: ESTADOS_ARCA[proveedor.arcaVerificationStatus] ?? 'pendiente',
    verificadoArcaEn: proveedor.arcaVerifiedAtUtc ?? null,
    notasArca: proveedor.arcaVerificationNotes ?? '',
    credencialesEnviadasEn: proveedor.credentialsSentAtUtc ?? null,
    estadoEmpresa: ESTADOS_EMPRESA_PROVEEDOR[proveedor.companySupplierStatus] ?? 'sin_habilitar',
    advertenciaEmpresa: proveedor.companySupplierWarning ?? '',
    politicaEstricta: proveedor.companySupplierStrictPolicy,
  }
}

function mapDocumentoProveedor(data) {
  return {
    id: data.id,
    proveedorId: data.supplierId,
    tipo: data.type,
    nombreArchivo: data.fileName,
    contentType: data.contentType,
    ruta: data.storagePath,
    fechaCarga: data.uploadedAtUtc,
    venceEl: data.expiresAtUtc,
    sha256Hash: data.sha256Hash,
    hashCorto: data.sha256Hash ? `${data.sha256Hash.slice(0, 12)}...` : '---',
    estado: ESTADOS_DOCUMENTO[data.status] ?? 'valido',
    alertaRegistradaEl: data.alertSentAtUtc,
    dictamen: VEREDICTOS_DOCUMENTO[data.verdict] ?? null,
    dictaminadoEl: data.verdictIssuedAtUtc,
    revisiones: (data.reviews ?? []).map(mapRevisionDocumento),
  }
}

function mapRevisionDocumento(review) {
  return {
    id: review.id,
    documentoId: review.supplierDocumentId,
    revisorId: review.reviewerId,
    accion: review.action,
    dictamen: VEREDICTOS_DOCUMENTO[review.verdict] ?? null,
    notas: review.notes,
    excepcion: review.exceptionReason,
    fecha: review.createdAtUtc,
  }
}

function mapInvitacionProveedor(data) {
  return {
    id: data.id,
    procesoId: data.purchaseProcessId,
    proveedorId: data.supplierId,
    estado: ESTADOS_INVITACION[data.status] ?? 'pendiente',
    invitadoEn: data.invitedAtUtc,
    tituloProceso: data.processTitle,
    codigoProceso: data.processCode,
    rejectionReason: data.rejectionReason ?? null,
  }
}

function formatearHace(fechaIso) {
  if (!fechaIso) return '—'
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(fechaIso))
}

function validar(datos) {
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
