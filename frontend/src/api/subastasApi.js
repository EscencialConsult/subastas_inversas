import { apiFetch, ApiError } from './client.js'

const DURACION_MIN = 10

export async function iniciarSubasta({ tenantId, procesoId }) {
  const auction = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/auction/start`, {
    method: 'POST',
    body: JSON.stringify({
      companyId: tenantId,
      purchaseProcessId: procesoId,
      durationMinutes: DURACION_MIN,
    }),
  })

  return mapSubasta(auction)
}

export async function cerrarSubasta({ tenantId, procesoId }) {
  const subasta = await obtenerSubastaDeProceso({ tenantId, procesoId })
  return apiFetch(`/api/companies/${tenantId}/auctions/${subasta.id}/close`, {
    method: 'POST',
  })
}

export async function obtenerSubastaDeProceso({ tenantId, procesoId }) {
  const auction = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/auction`)
  return mapSubasta(auction)
}

export async function simularLance({ tenantId, procesoId }) {
  const subasta = await obtenerSubastaDeProceso({ tenantId, procesoId })
  const supplierId = subasta.participantes[0]

  if (!supplierId) {
    throw new ApiError('La subasta no tiene proveedores invitados.', 409)
  }

  const monto = Math.round(mejorOferta(subasta) * 0.98)
  await apiFetch(`/api/companies/${tenantId}/auctions/${subasta.id}/bids`, {
    method: 'POST',
    body: JSON.stringify({
      auctionId: subasta.id,
      supplierId,
      amount: monto,
    }),
  })

  return obtenerSubastaDeProceso({ tenantId, procesoId })
}

export function mejorOferta(subasta) {
  if (!subasta.lances.length) return subasta.precioBase
  return Math.min(...subasta.lances.map((l) => l.monto))
}

function mapSubasta(auction) {
  return {
    id: auction.id,
    procesoId: auction.purchaseProcessId,
    tenantId: auction.companyId,
    precioBase: auction.basePrice,
    precioActual: auction.currentPrice,
    decrementoMinimo: auction.minimumDecrementPercentage,
    inicioISO: auction.startsAtUtc,
    finISO: auction.endsAtUtc,
    duracionMin: Math.max(
      1,
      Math.round((new Date(auction.endsAtUtc).getTime() - new Date(auction.startsAtUtc).getTime()) / 60000),
    ),
    estado: auction.status,
    participantes: auction.participantSupplierIds ?? [],
    lances: (auction.bids ?? []).map((bid) => ({
      id: bid.id,
      proveedor: bid.supplierName,
      monto: bid.amount,
      hace: formatearHace(bid.placedAtUtc),
    })),
  }
}

function formatearHace(fechaIso) {
  const diff = Math.max(0, Date.now() - new Date(fechaIso).getTime())
  const minutes = Math.floor(diff / 60000)
  if (minutes === 0) return 'recien'
  if (minutes === 1) return '1 min'
  return `${minutes} min`
}
