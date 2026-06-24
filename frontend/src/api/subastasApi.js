import { apiFetch, ApiError } from './client.js'
import { listarProcesos } from './comprasApi.js'

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
  await apiFetch(`/api/companies/${tenantId}/auctions/${subasta.id}/close`, {
    method: 'POST',
  })
  return subasta
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

export async function listarSubastasRealizadas({ tenantId, busqueda = '', estado = '' }) {
  const procesos = await listarProcesos({ tenantId, busqueda, estado })
  const filas = []

  for (const proceso of procesos) {
    try {
      const subasta = await obtenerSubastaDeProceso({ tenantId, procesoId: proceso.id })
      const a = analisisSubasta(subasta)
      filas.push({
        procesoId: proceso.id,
        codigo: proceso.codigo,
        titulo: proceso.titulo,
        estadoProceso: proceso.estado,
        oferentes: a.oferentes,
        base: a.base,
        mejor: a.mejor,
        bajaPorcentaje: a.bajaPorcentaje,
        nivelBaja: a.nivelBaja,
        proveedorAdjudicado: proceso.adjudicacion?.proveedor ?? null,
      })
    } catch (error) {
      if (error.status !== 404) throw error
    }
  }

  return filas
}

export function mejorOferta(subasta) {
  if (!subasta.lances.length) return subasta.precioBase
  return Math.min(...subasta.lances.map((l) => l.monto))
}

export function analisisSubasta(subasta) {
  const oferentes = new Set(subasta.lances.map((l) => l.proveedor)).size
  const mejor = mejorOferta(subasta)
  const base = subasta.precioBase || 0
  const bajaPorcentaje = base > 0 ? ((base - mejor) / base) * 100 : 0

  return {
    oferentes,
    cantidadLances: subasta.lances.length,
    base,
    mejor,
    bajaPorcentaje,
    nivelBaja: nivelDeBaja(bajaPorcentaje),
  }
}

function nivelDeBaja(porcentaje) {
  if (porcentaje >= 15) return 'alta'
  if (porcentaje >= 5) return 'moderada'
  return 'baja'
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
