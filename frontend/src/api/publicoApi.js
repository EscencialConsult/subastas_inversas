import { apiFetch } from './client.js'
import { ESTADO_PROCESO } from '../domain/compras.js'

const ESTADOS_BACK_TO_FRONT = {
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
    codigo: item.code,
    titulo: item.title,
    estado: ESTADOS_BACK_TO_FRONT[item.status] ?? item.status,
    empresa: item.companyName,
    tieneSubasta: item.status === 'InAuction',
  }))

  if (estado) filas = filas.filter((f) => f.estado === estado)
  return filas
}

export async function obtenerSubastaPublica({ procesoId }) {
  const data = await apiFetch('/api/public/auctions/live')
  const subasta = data.find((item) => item.purchaseProcessId === procesoId || item.id === procesoId)

  if (!subasta) {
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
      montos: [],
    }
  }

  return {
    codigo: subasta.processCode,
    titulo: subasta.processTitle,
    empresa: subasta.companyName,
    estadoProceso: ESTADO_PROCESO.EN_SUBASTA,
    precioBase: subasta.basePrice,
    precioActual: subasta.currentPrice,
    cantidadLances: subasta.bidCount,
    inicioISO: subasta.startsAtUtc,
    duracionMin: Math.max(
      1,
      Math.round((new Date(subasta.endsAtUtc).getTime() - new Date(subasta.startsAtUtc).getTime()) / 60000),
    ),
    montos: [],
  }
}
