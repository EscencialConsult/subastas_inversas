import { API_URL, apiFetch, ApiError } from './client'
import { listarProcesos, listarProcesosParaAuditoria, type ProcesoMapped } from './comprasApi'

const ESTADOS_SUBASTA: Record<string | number, string> = {
  0: 'Open',
  1: 'Closed',
  2: 'Scheduled',
  Open: 'Open',
  Closed: 'Closed',
  Scheduled: 'Scheduled',
}

interface AuctionResponse {
  id?: string
  purchaseProcessId?: string
  companyId?: string
  basePrice?: number
  currentPrice?: number
  minimumDecrementPercentage?: number
  startsAtUtc?: string
  endsAtUtc?: string
  closingActHash?: string | null
  closingActUrl?: string | null
  savingsAmount?: number | null
  savingsPercentage?: number | null
  status?: string | number
  autoExtensionMinutes?: number
  pabThreshold?: number
  participantSupplierIds?: string[]
  comparisonRows?: AuctionComparisonRowResponse[]
  bids?: BidResponse[]
}

interface AuctionComparisonRowResponse {
  position?: number
  supplierId?: string
  supplierName?: string
  bestAmount?: number
  bidCount?: number
  lastBidAtUtc?: string
  savingsAmount?: number
  savingsPercentage?: number
}

interface BidResponse {
  id?: string
  supplierId?: string
  supplierName?: string
  amount?: number
  placedAtUtc?: string
  isPab?: boolean
}

export interface SubastaMapped {
  id: string
  procesoId: string
  tenantId: string
  precioBase: number
  precioActual: number
  decrementoMinimo: number
  inicioISO: string
  finISO: string
  actaCierreHash: string | null
  actaCierreUrl: string | null
  ahorroMonto: number
  ahorroPorcentaje: number
  duracionMin: number
  estado: string
  autoExtensionMinutes: number
  pabThreshold: number
  participantes: string[]
  cuadroComparativo: Array<{
    posicion: number
    proveedorId: string
    proveedor: string
    mejorMonto: number
    cantidadLances: number
    ultimoLanceEn: string
    ahorroMonto: number
    ahorroPorcentaje: number
  }>
  lances: Array<{
    id: string
    proveedorId: string
    proveedor: string
    monto: number
    hace: string
    isPab: boolean
  }>
}

export interface SubastaFilaMapped {
  procesoId: string
  codigo: string
  titulo: string
  estadoProceso: string
  oferentes: number
  base: number
  mejor: number
  bajaPorcentaje: number
  nivelBaja: string
  proveedorAdjudicado: string | null
}

export interface AnalisisSubasta {
  oferentes: number
  cantidadLances: number
  base: number
  mejor: number
  bajaPorcentaje: number
  nivelBaja: string
}

interface SubastaCommandParams {
  tenantId: string
  procesoId: string
}

interface IniciarSubastaParams extends SubastaCommandParams {
  basePrice: number | string
  minimumDecrementPercentage: number | string
  startsAtUtc?: string | null
  durationMinutes: number | string
  autoExtensionMinutes: number | string
  pabThreshold: number | string
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
}: IniciarSubastaParams): Promise<SubastaMapped> {
  const auction = await apiFetch<AuctionResponse>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/auction/start`, {
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

export async function cerrarSubasta({ tenantId, procesoId }: SubastaCommandParams): Promise<SubastaMapped> {
  const subasta = await obtenerSubastaDeProceso({ tenantId, procesoId })
  await apiFetch(`/api/companies/${tenantId}/auctions/${subasta.id}/close`, {
    method: 'POST',
  })
  return subasta
}

export async function obtenerSubastaDeProceso({ tenantId, procesoId }: SubastaCommandParams): Promise<SubastaMapped> {
  const auction = await apiFetch<AuctionResponse>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/auction`)
  return mapSubasta(auction)
}

export async function obtenerSubastaDeProcesoParaAprobacion({ tenantId, procesoId }: SubastaCommandParams): Promise<SubastaMapped> {
  const auction = await apiFetch<AuctionResponse>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/auction/approval`)
  return mapSubasta(auction)
}

export async function obtenerSubastaDeProcesoParaAuditoria({ tenantId, procesoId }: SubastaCommandParams): Promise<SubastaMapped> {
  const auction = await apiFetch<AuctionResponse>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/auction/audit`)
  return mapSubasta(auction)
}

export async function obtenerSubastaDeProcesoParaEvaluacion({ tenantId, procesoId }: SubastaCommandParams): Promise<SubastaMapped> {
  const auction = await apiFetch<AuctionResponse>(`/api/companies/${tenantId}/purchase-processes/${procesoId}/auction/evaluate`)
  return mapSubasta(auction)
}

export async function simularLance({ tenantId, procesoId }: SubastaCommandParams): Promise<SubastaMapped> {
  const subasta = await obtenerSubastaDeProceso({ tenantId, procesoId })
  const ultimoLance = [...subasta.lances].reverse()[0]
  const supplierId = subasta.participantes.find((id) => id !== ultimoLance?.proveedorId)

  if (!supplierId) {
    throw new ApiError(
      subasta.participantes.length === 0
        ? 'La subasta no tiene proveedores invitados.'
        : 'No hay otro proveedor disponible para simular un lance sin romper la regla de alternancia.',
      409,
    )
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

export async function listarSubastasRealizadas({ tenantId, busqueda = '', estado = '' }: { tenantId: string; busqueda?: string; estado?: string }): Promise<SubastaFilaMapped[]> {
  const procesos = await listarProcesos({ tenantId, busqueda, estado })
  return mapSubastasDeProcesos({ tenantId, procesos, obtenerSubasta: obtenerSubastaDeProceso })
}

export async function listarSubastasRealizadasParaAuditoria({ tenantId, busqueda = '', estado = '' }: { tenantId: string; busqueda?: string; estado?: string }): Promise<SubastaFilaMapped[]> {
  const procesos = await listarProcesosParaAuditoria({ tenantId, busqueda, estado })
  return mapSubastasDeProcesos({
    tenantId,
    procesos,
    obtenerSubasta: obtenerSubastaDeProcesoParaAuditoria,
  })
}

async function mapSubastasDeProcesos({
  tenantId,
  procesos,
  obtenerSubasta,
}: {
  tenantId: string
  procesos: ProcesoMapped[]
  obtenerSubasta: (params: SubastaCommandParams) => Promise<SubastaMapped>
}): Promise<SubastaFilaMapped[]> {
  const filas: SubastaFilaMapped[] = []

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
      if (!(error instanceof ApiError)) throw error
      if (error.status !== 404) throw error
    }
  }

  return filas
}

export function mejorOferta(subasta: SubastaMapped): number {
  if (!subasta.lances.length) return subasta.precioBase
  return Math.min(...subasta.lances.map((l) => l.monto))
}

export function analisisSubasta(subasta: SubastaMapped): AnalisisSubasta {
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

function nivelDeBaja(porcentaje: number): string {
  if (porcentaje >= 15) return 'alta'
  if (porcentaje >= 5) return 'moderada'
  return 'baja'
}

function mapSubasta(auction: AuctionResponse): SubastaMapped {
  return {
    id: auction.id ?? '',
    procesoId: auction.purchaseProcessId ?? '',
    tenantId: auction.companyId ?? '',
    precioBase: auction.basePrice ?? 0,
    precioActual: auction.currentPrice ?? auction.basePrice ?? 0,
    decrementoMinimo: auction.minimumDecrementPercentage ?? 0,
    inicioISO: auction.startsAtUtc ?? '',
    finISO: auction.endsAtUtc ?? '',
    actaCierreHash: auction.closingActHash ?? null,
    actaCierreUrl: auction.closingActUrl ? `${API_URL}${auction.closingActUrl}` : null,
    ahorroMonto: auction.savingsAmount ?? 0,
    ahorroPorcentaje: auction.savingsPercentage ?? 0,
    duracionMin: Math.max(
      1,
      Math.round((new Date(auction.endsAtUtc ?? 0).getTime() - new Date(auction.startsAtUtc ?? 0).getTime()) / 60000),
    ),
    estado: ESTADOS_SUBASTA[auction.status ?? ''] ?? String(auction.status ?? ''),
    autoExtensionMinutes: auction.autoExtensionMinutes ?? 0,
    pabThreshold: auction.pabThreshold ?? 0,
    participantes: auction.participantSupplierIds ?? [],
    cuadroComparativo: (auction.comparisonRows ?? []).map((row) => ({
      posicion: row.position ?? 0,
      proveedorId: row.supplierId ?? '',
      proveedor: row.supplierName ?? '',
      mejorMonto: row.bestAmount ?? 0,
      cantidadLances: row.bidCount ?? 0,
      ultimoLanceEn: row.lastBidAtUtc ?? '',
      ahorroMonto: row.savingsAmount ?? 0,
      ahorroPorcentaje: row.savingsPercentage ?? 0,
    })),
    lances: (auction.bids ?? []).map((bid) => ({
      id: bid.id ?? '',
      proveedorId: bid.supplierId ?? '',
      proveedor: bid.supplierName ?? '',
      monto: bid.amount ?? 0,
      hace: formatearHace(bid.placedAtUtc ?? ''),
      isPab: Boolean(bid.isPab),
    })),
  }
}

function formatearHace(fechaIso: string): string {
  const diff = Math.max(0, Date.now() - new Date(fechaIso).getTime())
  const minutes = Math.floor(diff / 60000)
  if (minutes === 0) return 'recien'
  if (minutes === 1) return '1 min'
  return `${minutes} min`
}
