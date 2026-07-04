import {
  aprobarAdjudicacion,
  devolverAdjudicacion,
  listarProcesosParaAprobacion,
  obtenerProcesoParaAprobacion,
  rechazarAdjudicacion,
} from '../../../shared/api/comprasApi'
import { obtenerSubastaDeProcesoParaAprobacion } from '../../../shared/api/subastasApi'
import { ESTADO_PROCESO } from '../../../domain/compras'

export const adjudicacionesKeys = {
  all: ['adjudicaciones'] as const,
  lists: () => [...adjudicacionesKeys.all, 'list'] as const,
  list: (params: { tenantId?: string | null; estado?: string }) => [...adjudicacionesKeys.lists(), params] as const,
  detail: (tenantId?: string | null, id?: string | null) => [...adjudicacionesKeys.all, 'detail', tenantId ?? '', id ?? ''] as const,
}

export async function listarAdjudicacionesQuery({ tenantId, estado = '' }: { tenantId?: string | null; estado?: string }) {
  const lista = await listarProcesosParaAprobacion({ tenantId: tenantId ?? '', estado })
  return lista.filter((p) => p.estado === ESTADO_PROCESO.ADJUDICADA || p.estado === ESTADO_PROCESO.APROBADA)
}

export async function adjudicacionDetalleQuery({ tenantId, id }: { tenantId?: string | null; id?: string | null }) {
  const proceso = await obtenerProcesoParaAprobacion({ tenantId: tenantId ?? '', id: id ?? '' })
  const subasta = proceso.tieneSubasta
    ? await obtenerSubastaDeProcesoParaAprobacion({ tenantId: tenantId ?? '', procesoId: id ?? '' }).catch(() => null)
    : null
  const ofertas = subasta ? [...subasta.lances].sort((a, b) => a.monto - b.monto) : []
  return { proceso, subasta, ofertas }
}

export function aprobarAdjudicacionMutation(params: { tenantId: string; id: string; autoridadId: string }) {
  return aprobarAdjudicacion(params)
}

export function rechazarAdjudicacionMutation(params: { tenantId: string; id: string; autoridadId: string; motivo: string }) {
  return rechazarAdjudicacion(params)
}

export function devolverAdjudicacionMutation(params: { tenantId: string; id: string; autoridadId: string; motivo: string }) {
  return devolverAdjudicacion(params)
}
