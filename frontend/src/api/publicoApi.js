import { apiFetch } from './client.js'
import { ESTADO_PROCESO } from '../domain/compras.js'

const ESTADOS_BACK_TO_FRONT = {
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
}

export async function listarProcesosPublicos({ busqueda = '', estado = '' } = {}) {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())

  const data = await apiFetch(`/api/public/purchase-processes${params.toString() ? `?${params}` : ''}`)
  let filas = data.map((item) => ({
    id: item.id,
    companyId: item.companyId,
    codigo: item.code,
    titulo: item.title,
    descripcion: item.description,
    estado: ESTADOS_BACK_TO_FRONT[item.status] ?? item.status,
    estadoBackend: item.status,
    empresa: item.companyName,
    tieneSubasta: Boolean(item.hasAuction),
    presupuestoEstimado: item.estimatedBudget,
    creadoEn: item.createdAtUtc,
    publicadoEn: item.publishedAtUtc,
  }))

  if (estado) filas = filas.filter((f) => f.estado === estado)
  return filas
}

export async function listarSubastasPublicas() {
  const data = await apiFetch('/api/public/auctions')
  return data.map(mapearSubastaPublica)
}

export async function listarAdjudicacionesPublicas({ busqueda = '' } = {}) {
  const params = new URLSearchParams()
  if (busqueda.trim()) params.set('search', busqueda.trim())

  const data = await apiFetch(`/api/public/awards${params.toString() ? `?${params}` : ''}`)
  return data.map((item) => ({
    id: item.id,
    procesoId: item.purchaseProcessId,
    companyId: item.companyId,
    empresa: item.companyName,
    codigo: item.processCode,
    titulo: item.processTitle,
    proveedor: item.supplierName,
    monto: item.amount,
    adjudicadoEn: item.adjudicatedAtUtc,
    observaciones: item.observations,
    actaUrl: item.actUrl,
  }))
}

export async function obtenerSubastaPublica({ procesoId }) {
  try {
    const subasta = await apiFetch(`/api/public/purchase-processes/${procesoId}/auction`)
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

function mapearSubastaPublica(subasta) {
  const inicio = new Date(subasta.startsAtUtc)
  const cierre = new Date(subasta.endsAtUtc)
  const finalizada = subasta.status === 'Closed' || subasta.status === 1 || cierre.getTime() <= Date.now()

  return {
    id: subasta.id,
    procesoId: subasta.purchaseProcessId,
    companyId: subasta.companyId,
    codigo: subasta.processCode,
    titulo: subasta.processTitle,
    empresa: subasta.companyName,
    estadoProceso: finalizada ? ESTADO_PROCESO.CERRADA : ESTADO_PROCESO.EN_SUBASTA,
    finalizada,
    precioBase: subasta.basePrice,
    precioActual: subasta.currentPrice,
    cantidadLances: subasta.bidCount,
    inicioISO: subasta.startsAtUtc,
    inicioEn: subasta.startsAtUtc,
    cierreEn: subasta.endsAtUtc,
    duracionMin: Math.max(
      1,
      Math.round((cierre.getTime() - inicio.getTime()) / 60000),
    ),
    montos: [],
  }
}
