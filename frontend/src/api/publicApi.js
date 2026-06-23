import { apiFetch } from './client.js'

const API_URL = 'http://localhost:5185'

export async function listarProcesosPublicos({ busqueda = '' } = {}) {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())

  const data = await apiFetch(`/api/public/purchase-processes${params.toString() ? `?${params}` : ''}`)
  return data.map((item) => ({
    id: item.id,
    companyId: item.companyId,
    companyName: item.companyName,
    code: item.code,
    title: item.title,
    description: item.description,
    estimatedBudget: item.estimatedBudget,
    status: item.status,
    publishedAt: item.publishedAtUtc?.slice(0, 10) ?? null,
  }))
}

export async function listarAdjudicacionesPublicas({ busqueda = '' } = {}) {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())

  const data = await apiFetch(`/api/public/awards${params.toString() ? `?${params}` : ''}`)
  return data.map((item) => ({
    id: item.id,
    purchaseProcessId: item.purchaseProcessId,
    companyId: item.companyId,
    companyName: item.companyName,
    processCode: item.processCode,
    processTitle: item.processTitle,
    supplierName: item.supplierName,
    amount: item.amount,
    adjudicatedAt: item.adjudicatedAtUtc?.slice(0, 10),
    observations: item.observations,
    actUrl: item.actUrl,
  }))
}

export async function listarSubastasPublicasEnVivo() {
  const data = await apiFetch('/api/public/auctions/live')
  return data.map(mapSubastaPublica)
}

export function abrirSseSubasta(auctionId, onAuction, onError) {
  const source = new EventSource(`${API_URL}/api/public/auctions/${auctionId}/events`)
  source.addEventListener('auction', (event) => {
    onAuction(mapSubastaSse(JSON.parse(event.data)))
  })
  source.onerror = (event) => {
    onError?.(event)
  }
  return source
}

function mapSubastaPublica(item) {
  return {
    id: item.id,
    purchaseProcessId: item.purchaseProcessId,
    companyId: item.companyId,
    companyName: item.companyName,
    processCode: item.processCode,
    processTitle: item.processTitle,
    basePrice: item.basePrice,
    currentPrice: item.currentPrice,
    status: item.status,
    startsAt: item.startsAtUtc,
    endsAt: item.endsAtUtc,
    bidCount: item.bidCount,
    eventsUrl: item.eventsUrl,
  }
}

function mapSubastaSse(item) {
  return {
    id: item.id,
    purchaseProcessId: item.purchaseProcessId,
    companyId: item.companyId,
    basePrice: item.basePrice,
    currentPrice: item.currentPrice,
    status: item.status,
    startsAt: item.startsAtUtc,
    endsAt: item.endsAtUtc,
    bidCount: item.bids?.length ?? 0,
    bids: item.bids ?? [],
  }
}
