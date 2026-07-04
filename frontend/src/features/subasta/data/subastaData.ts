import {
  cerrarSubasta,
  listarSubastasRealizadasParaAuditoria,
  obtenerSubastaDeProceso,
  simularLance,
} from '../../../shared/api/subastasApi'
import { obtenerProceso } from '../../../shared/api/comprasApi'

export const subastaKeys = {
  all: ['subastas'] as const,
  proceso: (tenantId?: string | null, procesoId?: string | null) =>
    [...subastaKeys.all, 'proceso', tenantId ?? '', procesoId ?? ''] as const,
  realizadas: (params: { tenantId?: string | null; busqueda?: string; estado?: string }) =>
    [...subastaKeys.all, 'realizadas', params] as const,
}

export async function obtenerSubastaProcesoQuery({ tenantId, procesoId }: { tenantId: string; procesoId: string }) {
  const [proceso, subasta] = await Promise.all([
    obtenerProceso({ tenantId, id: procesoId }),
    obtenerSubastaDeProceso({ tenantId, procesoId }),
  ])
  return { proceso, subasta }
}

export function simularLanceMutation(params: { tenantId: string; procesoId: string }) {
  return simularLance(params)
}

export function cerrarSubastaMutation(params: { tenantId: string; procesoId: string }) {
  return cerrarSubasta(params)
}

export function listarSubastasRealizadasQuery(params: { tenantId?: string | null; busqueda?: string; estado?: string }) {
  return listarSubastasRealizadasParaAuditoria({
    tenantId: params.tenantId ?? '',
    busqueda: params.busqueda ?? '',
    estado: params.estado ?? '',
  })
}
