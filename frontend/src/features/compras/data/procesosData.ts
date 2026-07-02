import {
  listarProcesos,
  listarProcesosParaAuditoria,
  publicarProceso,
  type ListarProcesosQueryParams,
} from '../../../shared/api/comprasApi'
import { iniciarSubasta } from '../../../shared/api/subastasApi'

export const procesosKeys = {
  all: ['procesos'] as const,
  lists: () => [...procesosKeys.all, 'list'] as const,
  list: (params: ListarProcesosQueryParams & { auditoria?: boolean }) =>
    [...procesosKeys.lists(), params] as const,
  detail: (tenantId?: string | null, id?: string | null) =>
    [...procesosKeys.all, 'detail', tenantId ?? '', id ?? ''] as const,
}

export function listarProcesosQuery(params: ListarProcesosQueryParams & { auditoria?: boolean }) {
  return params.auditoria ? listarProcesosParaAuditoria(params) : listarProcesos(params)
}

export function publicarProcesoMutation(params: { tenantId: string; id: string }) {
  return publicarProceso(params)
}

export function iniciarSubastaProcesoMutation(params: {
  tenantId: string
  procesoId: string
  basePrice: number | string
  minimumDecrementPercentage: number | string
  startsAtUtc?: string | null
  durationMinutes: number | string
  autoExtensionMinutes: number | string
  pabThreshold: number | string
}) {
  return iniciarSubasta(params)
}
