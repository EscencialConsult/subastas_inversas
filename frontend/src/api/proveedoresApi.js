import { apiFetch, ApiError } from './client.js'

const ESTADOS = {
  0: 'pendiente',
  1: 'verificado',
  2: 'rechazado',
  Pending: 'pendiente',
  Verified: 'verificado',
  Rejected: 'rechazado',
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
    provincia: proveedor.province,
    localidad: proveedor.locality,
    estado: ESTADOS[proveedor.status] ?? 'pendiente',
    arcaVerificado: proveedor.arcaVerified,
  }
}

export async function listarProveedores({ busqueda = '', estado = '' } = {}) {
  const data = await apiFetch('/api/suppliers')
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
    rubro: proveedor.rubro ?? '---',
    arcaVerificado: proveedor.arcaVerified,
  }))

  if (busqueda.trim()) {
    const q = busqueda.trim().toLowerCase()
    resultado = resultado.filter((p) =>
      `${p.razonSocial} ${p.cuit} ${p.email} ${p.provincia} ${p.localidad}`
        .toLowerCase()
        .includes(q),
    )
  }
  if (estado) resultado = resultado.filter((p) => p.estado === estado)

  return resultado
}

export async function listarInvitacionesDeProveedor({ proveedorId }) {
  return apiFetch(`/api/suppliers/${proveedorId}/invitations`)
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
  if (datos.password !== datos.repetir) {
    throw new ApiError('La contrasena y su repeticion no coinciden.', 422)
  }
}
