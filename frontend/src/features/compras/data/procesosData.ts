import {
  adjudicarProceso,
  declararProcesoDesierto,
  invitarProveedorAProceso,
  listarProcesos,
  listarProcesosParaAuditoria,
  listarComprasRealizadas,
  obtenerDictamenAsistido,
  obtenerProceso,
  obtenerResultadosEvaluacion,
  publicarProceso,
  suspenderProcesoPorImpugnacion,
  type ListarProcesosQueryParams,
} from '../../../shared/api/comprasApi'
import { obtenerSubastaDeProceso, iniciarSubasta } from '../../../shared/api/subastasApi'

export const procesosKeys = {
  all: ['procesos'] as const,
  lists: () => [...procesosKeys.all, 'list'] as const,
  list: (params: ListarProcesosQueryParams & { auditoria?: boolean }) =>
    [...procesosKeys.lists(), params] as const,
  detail: (tenantId?: string | null, id?: string | null) =>
    [...procesosKeys.all, 'detail', tenantId ?? '', id ?? ''] as const,
  comprasRealizadas: (params: { tenantId?: string | null; busqueda?: string }) =>
    [...procesosKeys.all, 'compras-realizadas', params] as const,
  invitables: (tenantId?: string | null) =>
    [...procesosKeys.all, 'invitables', tenantId ?? ''] as const,
}

export function listarProcesosQuery(params: ListarProcesosQueryParams & { auditoria?: boolean }) {
  return params.auditoria ? listarProcesosParaAuditoria(params) : listarProcesos(params)
}

export function listarComprasRealizadasQuery(params: { tenantId?: string | null; busqueda?: string }) {
  return listarComprasRealizadas({ tenantId: params.tenantId ?? '', busqueda: params.busqueda ?? '' })
}

export async function listarProcesosInvitablesQuery(params: { tenantId?: string | null }) {
  const procesos = await listarProcesos({ tenantId: params.tenantId ?? '' })
  return procesos.filter((proceso) => proceso.estado === 'publicado')
}

export function obtenerProcesoQuery({ tenantId, id }: { tenantId?: string | null; id?: string | null }) {
  return obtenerProceso({ tenantId: tenantId ?? '', id: id ?? '' })
}

export async function adjudicarProcesoPageQuery({ tenantId, id }: { tenantId?: string | null; id?: string | null }) {
  const companyId = tenantId ?? ''
  const procesoId = id ?? ''
  const [proceso, subasta, dictamen] = await Promise.all([
    obtenerProceso({ tenantId: companyId, id: procesoId }),
    obtenerSubastaDeProceso({ tenantId: companyId, procesoId }),
    obtenerDictamenAsistido({ tenantId: companyId, procesoId }).catch(() => null),
  ])

  const ofertas = [...subasta.lances].sort((a, b) => a.monto - b.monto)
  const evalResults = await obtenerResultadosEvaluacion({ tenantId: companyId, procesoId }).catch(() => null)
  return { proceso, subasta, dictamen, ofertas, evalResults }
}

export function publicarProcesoMutation(params: { tenantId: string; id: string }) {
  return publicarProceso(params)
}

export function invitarProveedorAProcesoMutation(params: { tenantId: string; procesoId: string; proveedorId: string }) {
  return invitarProveedorAProceso(params)
}

export function adjudicarProcesoMutation(params: { tenantId: string; id: string; compradorId: string; proveedor: string }) {
  return adjudicarProceso(params)
}

export function declararProcesoDesiertoMutation(params: { tenantId: string; id: string; operadorId: string; fundamento: string }) {
  return declararProcesoDesierto(params)
}

export function suspenderProcesoPorImpugnacionMutation(params: { tenantId: string; id: string; operadorId: string; fundamento: string }) {
  return suspenderProcesoPorImpugnacion(params)
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
