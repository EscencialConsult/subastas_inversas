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

export async function registrarProveedor({ datos }) {
  validar(datos)

  return apiFetch('/api/suppliers/register', {
    method: 'POST',
    body: JSON.stringify({
      businessName: datos.razonSocial.trim(),
      cuit: datos.cuit.trim(),
      email: datos.email.trim(),
      password: datos.password,
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
  const params = new URLSearchParams()
  if (tenantId) params.set('companyId', tenantId)
  if (busqueda.trim()) params.set('search', busqueda.trim())
  if (rubro.trim()) params.set('rubro', rubro.trim())
  if (provincia.trim()) params.set('province', provincia.trim())
  if (localidad.trim()) params.set('locality', localidad.trim())
  if (cercania) params.set('proximity', cercania)

  const query = params.toString() ? `?${params}` : ''
  const data = await apiFetch(`/api/suppliers${query}`)
  const items = Array.isArray(data) ? data : (data.items ?? [])
  let resultado = items.map((proveedor) => ({
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
    estadoEmpresa: ESTADOS_EMPRESA_PROVEEDOR[proveedor.companySupplierStatus] ?? 'sin_habilitar',
    advertenciaEmpresa: proveedor.companySupplierWarning ?? '',
    politicaEstricta: proveedor.companySupplierStrictPolicy,
  }))

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
  return apiFetch(`/api/suppliers/${proveedorId}/invitations`)
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
  return apiFetch(`/api/suppliers/documents/${documentoId}/observations`, {
    method: 'POST',
    body: JSON.stringify({
      documentId: documentoId,
      evaluatorId: evaluadorId,
      notes: notas,
    }),
  })
}

export async function dictaminarDocumentoProveedor({
  documentoId,
  evaluadorId,
  dictamen,
  notas,
  excepcion,
}) {
  return apiFetch(`/api/suppliers/documents/${documentoId}/verdicts`, {
    method: 'POST',
    body: JSON.stringify({
      documentId: documentoId,
      evaluatorId: evaluadorId,
      verdict: dictamen,
      notes: notas,
      exceptionReason: excepcion || null,
    }),
  })
}

export async function responderInvitacion({ invitacionId, proveedorId, aceptar }) {
  return apiFetch(`/api/suppliers/invitations/${invitacionId}/respond`, {
    method: 'PATCH',
    body: JSON.stringify({
      invitationId: invitacionId,
      supplierId: proveedorId,
      newStatus: aceptar ? 1 : 2,
    }),
  })
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
  return apiFetch(`/api/companies/${tenantId}/auctions/${auctionId}/bids`, {
    method: 'POST',
    body: JSON.stringify({
      auctionId,
      supplierId,
      amount: monto,
    }),
  })
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
    inicioISO: data.startsAtUtc,
    finISO: data.endsAtUtc,
    estado: data.status,
    participantes: data.participantSupplierIds ?? [],
    lances: (data.bids ?? []).map((bid) => ({
      id: bid.id,
      proveedor: bid.supplierName,
      monto: bid.amount,
      hace: formatearHace(bid.placedAtUtc),
    })),
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
    revisiones: (data.reviews ?? []).map((review) => ({
      id: review.id,
      accion: review.action,
      dictamen: VEREDICTOS_DOCUMENTO[review.verdict] ?? null,
      notas: review.notes,
      excepcion: review.exceptionReason,
      fecha: review.createdAtUtc,
    })),
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
    throw new ApiError('El CUIT no tiene un formato valido (ej: 30-12345678-9).', 422)
  }
  if (!datos.email?.trim()) throw new ApiError('El email es obligatorio.', 422)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) {
    throw new ApiError('El email no tiene un formato valido.', 422)
  }
  if (!datos.password || datos.password.length < 6) {
    throw new ApiError('La contrasena debe tener al menos 6 caracteres.', 422)
  }
  if (!datos.rubro?.trim()) throw new ApiError('El rubro es obligatorio.', 422)
  if (datos.password !== datos.repetir) {
    throw new ApiError('La contrasena y su repeticion no coinciden.', 422)
  }
}
