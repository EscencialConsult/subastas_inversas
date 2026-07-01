import { API_URL, apiFetch, ApiError } from './client'
import { listarProcesos, listarProcesosParaAuditoria } from './comprasApi.js'

const ESTADOS_SUBASTA = {
  0: 'Open',
  1: 'Closed',
  2: 'Scheduled',
  Open: 'Open',
  Closed: 'Closed',
  Scheduled: 'Scheduled',
}

export async function iniciarSubasta({
  tenantId,
  procesoId,
  basePrice,
  minimumDecrementPercentage,
  startsAtUtc,
  durationMinutes,
  autoExtensionMinutes,
  pabThreshold,
}) {
  const auction = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/auction/start`, {
    method: 'POST',
    body: JSON.stringify({
      companyId: tenantId,
      purchaseProcessId: procesoId,
      basePrice: Number(basePrice),
      minimumDecrementPercentage: Number(minimumDecrementPercentage),
      startsAtUtc: startsAtUtc || null,
      durationMinutes: Number(durationMinutes),
      autoExtensionMinutes: Number(autoExtensionMinutes),
      pabThreshold: Number(pabThreshold),
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

export async function obtenerSubastaDeProcesoParaAprobacion({ tenantId, procesoId }) {
  const auction = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/auction/approval`)
  return mapSubasta(auction)
}

export async function obtenerSubastaDeProcesoParaAuditoria({ tenantId, procesoId }) {
  const auction = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/auction/audit`)
  return mapSubasta(auction)
}

export async function obtenerSubastaDeProcesoParaEvaluacion({ tenantId, procesoId }) {
  const auction = await apiFetch(`/api/companies/${tenantId}/purchase-processes/${procesoId}/auction/evaluate`)
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
  return mapSubastasDeProcesos({ tenantId, procesos, obtenerSubasta: obtenerSubastaDeProceso })
}

export async function listarSubastasRealizadasParaAuditoria({ tenantId, busqueda = '', estado = '' }) {
  const procesos = await listarProcesosParaAuditoria({ tenantId, busqueda, estado })
  return mapSubastasDeProcesos({
    tenantId,
    procesos,
    obtenerSubasta: obtenerSubastaDeProcesoParaAuditoria,
  })
}

async function mapSubastasDeProcesos({ tenantId, procesos, obtenerSubasta }) {
  const filas = []

  for (const proceso of procesos) {
    if (!proceso.tieneSubasta) continue

    try {
      const subasta = await obtenerSubasta({ tenantId, procesoId: proceso.id })
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
    actaCierreHash: auction.closingActHash ?? null,
    actaCierreUrl: auction.closingActUrl ? `${API_URL}${auction.closingActUrl}` : null,
    ahorroMonto: auction.savingsAmount ?? 0,
    ahorroPorcentaje: auction.savingsPercentage ?? 0,
    duracionMin: Math.max(
      1,
      Math.round((new Date(auction.endsAtUtc).getTime() - new Date(auction.startsAtUtc).getTime()) / 60000),
    ),
    estado: ESTADOS_SUBASTA[auction.status] ?? auction.status,
    autoExtensionMinutes: auction.autoExtensionMinutes,
    pabThreshold: auction.pabThreshold,
    participantes: auction.participantSupplierIds ?? [],
    cuadroComparativo: (auction.comparisonRows ?? []).map((row) => ({
      posicion: row.position,
      proveedorId: row.supplierId,
      proveedor: row.supplierName,
      mejorMonto: row.bestAmount,
      cantidadLances: row.bidCount,
      ultimoLanceEn: row.lastBidAtUtc,
      ahorroMonto: row.savingsAmount,
      ahorroPorcentaje: row.savingsPercentage,
    })),
    lances: (auction.bids ?? []).map((bid) => ({
      id: bid.id,
      proveedorId: bid.supplierId,
      proveedor: bid.supplierName,
      monto: bid.amount,
      hace: formatearHace(bid.placedAtUtc),
      isPab: Boolean(bid.isPab),
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
