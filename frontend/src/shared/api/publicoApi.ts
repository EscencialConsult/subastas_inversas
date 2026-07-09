import { API_URL, apiFetch } from './client'
import { ESTADO_PROCESO } from '../../domain/compras'

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

const ESTADOS_SUBASTA: Record<string | number, string> = {
  0: 'Open',
  1: 'Closed',
  2: 'Scheduled',
  Open: 'Open',
  Closed: 'Closed',
  Scheduled: 'Scheduled',
}

interface PublicProcessResponse {
  id?: string
  companyId?: string
  code?: string
  title?: string
  description?: string
  status?: string | number
  companyName?: string
  hasAuction?: boolean
  estimatedBudget?: number
  createdAtUtc?: string
  publishedAtUtc?: string
  closedAtUtc?: string | null
  specificationsHash?: string | null
  items?: PublicProcessItemResponse[]
  auction?: PublicAuctionResponse | null
  awards?: PublicAwardResponse[]
}

interface PublicProcessItemResponse {
  id?: string
  description?: string
  quantity?: number
  unit?: string
  estimatedUnitPrice?: number
  estimatedTotal?: number
}

interface PublicAuctionResponse {
  id?: string
  purchaseProcessId?: string
  companyId?: string
  processCode?: string
  processTitle?: string
  companyName?: string
  status?: string | number
  startsAtUtc?: string
  endsAtUtc?: string
  basePrice?: number
  currentPrice?: number
  bidCount?: number
  identitiesRevealed?: boolean
  ranking?: PublicAuctionRankingResponse[]
  eventsUrl?: string
}

interface PublicAuctionRankingResponse {
  position?: number
  supplierId?: string
  displayName?: string
  amount?: number
  bidCount?: number
  lastBidAtUtc?: string
}

interface PublicAwardResponse {
  id?: string
  purchaseProcessId?: string
  companyId?: string
  companyName?: string
  processCode?: string
  processTitle?: string
  supplierName?: string
  amount?: number
  adjudicatedAtUtc?: string
  observations?: string | null
  actUrl?: string | null
}

export interface PublicProcessMapped {
  id: string
  companyId: string
  codigo: string
  titulo: string
  descripcion?: string
  estado: string
  estadoBackend?: string | number
  empresa: string
  tieneSubasta: boolean
  presupuestoEstimado: number
  creadoEn?: string
  publicadoEn?: string
}

export interface PublicAuctionMapped {
  id?: string
  procesoId?: string
  companyId?: string
  codigo: string
  titulo: string
  empresa: string
  estadoProceso: string
  estadoSubasta?: string
  programada?: boolean
  finalizada?: boolean
  precioBase: number
  precioActual: number
  cantidadLances: number
  identidadesReveladas?: boolean
  ranking?: Array<{
    posicion: number
    proveedorId: string
    nombre: string
    monto: number
    cantidadLances: number
    ultimoLanceEn?: string
  }>
  eventsUrl?: string
  inicioISO: string | null
  inicioEn: string | null
  cierreEn: string | null
  duracionMin: number
  montos: number[]
  disponible?: boolean
}

export interface PublicAwardMapped {
  id: string
  procesoId: string
  companyId: string
  empresa: string
  codigo: string
  titulo: string
  proveedor: string
  monto: number
  adjudicadoEn?: string
  observaciones?: string | null
  actaUrl?: string | null
}

export async function listarProcesosPublicos({ busqueda = '', estado = '' }: { busqueda?: string; estado?: string } = {}): Promise<PublicProcessMapped[]> {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())
  if (estado) params.set('estado', estado)

  const data = await apiFetch<PublicProcessResponse[]>(`/api/public/purchase-processes${params.toString() ? `?${params}` : ''}`)
  let filas = data.map(mapearProcesoPublico)

  if (estado) filas = filas.filter((f) => f.estado === estado)
  return filas
}

export async function obtenerProcesoPublico({ procesoId }: { procesoId: string }) {
  const item = await apiFetch<PublicProcessResponse>(`/api/public/purchase-processes/${procesoId}`)
  return {
    ...mapearProcesoPublico(item),
    cerradoEn: item.closedAtUtc,
    especificacionesHash: item.specificationsHash ?? '',
    items: (item.items ?? []).map((linea) => ({
      id: linea.id,
      descripcion: linea.description,
      cantidad: linea.quantity,
      unidad: linea.unit,
      precioUnitarioEstimado: linea.estimatedUnitPrice,
      totalEstimado: linea.estimatedTotal,
    })),
    subasta: item.auction ? mapearSubastaPublica(item.auction) : null,
    adjudicaciones: (item.awards ?? []).map(mapearAdjudicacionPublica),
  }
}

export async function listarSubastasPublicas(): Promise<PublicAuctionMapped[]> {
  const data = await apiFetch<PublicAuctionResponse[]>('/api/public/auctions')
  return data.map(mapearSubastaPublica)
}

export async function listarAdjudicacionesPublicas({ busqueda = '' }: { busqueda?: string } = {}): Promise<PublicAwardMapped[]> {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())

  const data = await apiFetch<PublicAwardResponse[]>(`/api/public/awards${params.toString() ? `?${params}` : ''}`)
  return data.map(mapearAdjudicacionPublica)
}

export async function obtenerSubastaPublica({ procesoId }: { procesoId: string }): Promise<PublicAuctionMapped> {
  try {
    const subasta = await apiFetch<PublicAuctionResponse>(`/api/public/purchase-processes/${procesoId}/auction`)
    return {
      ...mapearSubastaPublica(subasta),
      disponible: true,
    }
  } catch {
    return {
      codigo: '---',
      titulo: 'Subasta no disponible',
      empresa: '---',
      estadoProceso: ESTADO_PROCESO.CERRADA,
      precioBase: 0,
      precioActual: 0,
      cantidadLances: 0,
      inicioISO: null,
      duracionMin: 0,
      inicioEn: null,
      cierreEn: null,
      montos: [],
      disponible: false,
    }
  }
}

export function suscribirSubastaPublica({
  eventsUrl,
  onSnapshot,
  onError,
}: {
  eventsUrl?: string | null
  onSnapshot?: (snapshot: PublicAuctionMapped) => void
  onError?: (error: unknown) => void
}) {
  if (!eventsUrl) return () => {}

  const url = `${API_URL}${eventsUrl.startsWith('/') ? eventsUrl : `/${eventsUrl}`}`
  const source = new EventSource(url)

  source.addEventListener('auction', (event) => {
    try {
      const snapshot = mapearSubastaPublica(JSON.parse(event.data))
      onSnapshot?.(snapshot)
      if (snapshot.finalizada) {
        source.close()
      }
    } catch (err) {
      onError?.(err)
    }
  })

  source.onerror = (event) => {
    onError?.(event)
  }

  return () => source.close()
}

function mapearSubastaPublica(subasta: PublicAuctionResponse): PublicAuctionMapped {
  const inicio = new Date(subasta.startsAtUtc ?? 0)
  const cierre = new Date(subasta.endsAtUtc ?? 0)
  const estadoSubasta = ESTADOS_SUBASTA[subasta.status ?? ''] ?? String(subasta.status ?? '')
  const finalizada = estadoSubasta === 'Closed' || cierre.getTime() <= Date.now()
  const programada = estadoSubasta === 'Scheduled' || inicio.getTime() > Date.now()

  return {
    id: subasta.id ?? '',
    procesoId: subasta.purchaseProcessId ?? '',
    companyId: subasta.companyId ?? '',
    codigo: subasta.processCode ?? '',
    titulo: subasta.processTitle ?? '',
    empresa: subasta.companyName ?? '',
    estadoProceso: finalizada ? ESTADO_PROCESO.CERRADA : ESTADO_PROCESO.EN_SUBASTA,
    estadoSubasta,
    programada,
    finalizada,
    precioBase: subasta.basePrice ?? 0,
    precioActual: subasta.currentPrice ?? 0,
    cantidadLances: subasta.bidCount ?? 0,
    identidadesReveladas: Boolean(subasta.identitiesRevealed),
    ranking: (subasta.ranking ?? []).map((item) => ({
      posicion: item.position ?? 0,
      proveedorId: item.supplierId ?? '',
      nombre: item.displayName ?? '',
      monto: item.amount ?? 0,
      cantidadLances: item.bidCount ?? 0,
      ultimoLanceEn: item.lastBidAtUtc,
    })),
    eventsUrl: subasta.eventsUrl ?? `/api/v1/public/auctions/${subasta.id}/events`,
    inicioISO: subasta.startsAtUtc ?? null,
    inicioEn: subasta.startsAtUtc ?? null,
    cierreEn: subasta.endsAtUtc ?? null,
    duracionMin: Math.max(
      1,
      Math.round((cierre.getTime() - inicio.getTime()) / 60000),
    ),
    montos: [],
  }
}

function mapearProcesoPublico(item: PublicProcessResponse): PublicProcessMapped {
  return {
    id: item.id ?? '',
    companyId: item.companyId ?? '',
    codigo: item.code ?? '',
    titulo: item.title ?? '',
    descripcion: item.description,
    estado: ESTADOS_BACK_TO_FRONT[item.status ?? ''] ?? String(item.status ?? ''),
    estadoBackend: item.status,
    empresa: item.companyName ?? '',
    tieneSubasta: Boolean(item.hasAuction),
    presupuestoEstimado: item.estimatedBudget ?? 0,
    creadoEn: item.createdAtUtc,
    publicadoEn: item.publishedAtUtc,
  }
}

function mapearAdjudicacionPublica(item: PublicAwardResponse): PublicAwardMapped {
  return {
    id: item.id ?? '',
    procesoId: item.purchaseProcessId ?? '',
    companyId: item.companyId ?? '',
    empresa: item.companyName ?? '',
    codigo: item.processCode ?? '',
    titulo: item.processTitle ?? '',
    proveedor: item.supplierName ?? '',
    monto: item.amount ?? 0,
    adjudicadoEn: item.adjudicatedAtUtc,
    observaciones: item.observations,
    actaUrl: item.actUrl,
  }
}
