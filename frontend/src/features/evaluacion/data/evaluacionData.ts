import {
  evaluarProveedores,
  guardarCriteriosEvaluacionParaEvaluador,
  listarProcesosParaEvaluacion,
  obtenerCriteriosEvaluacionParaEvaluador,
  obtenerProcesoParaEvaluacion,
  obtenerResultadosEvaluacionParaEvaluador,
} from '../../../shared/api/comprasApi'
import { obtenerSubastaDeProcesoParaEvaluacion } from '../../../shared/api/subastasApi'
import { ESTADO_PROCESO } from '../../../domain/compras'

export const evaluacionKeys = {
  all: ['evaluacion'] as const,
  lists: () => [...evaluacionKeys.all, 'list'] as const,
  list: (params: { tenantId?: string | null; busqueda?: string }) => [...evaluacionKeys.lists(), params] as const,
  detail: (tenantId?: string | null, procesoId?: string | null) => [...evaluacionKeys.all, 'detail', tenantId ?? '', procesoId ?? ''] as const,
}

export async function listarProcesosEvaluacionQuery({ tenantId, busqueda = '' }: { tenantId?: string | null; busqueda?: string }) {
  const lista = await listarProcesosParaEvaluacion({ tenantId: tenantId ?? '', busqueda })
  return lista.filter((proceso) => proceso.estado === ESTADO_PROCESO.CERRADA)
}

export async function evaluacionProcesoQuery({ tenantId, procesoId }: { tenantId?: string | null; procesoId?: string | null }) {
  const proceso = await obtenerProcesoParaEvaluacion({ tenantId: tenantId ?? '', id: procesoId ?? '' })
  const subasta = proceso.tieneSubasta
    ? await obtenerSubastaDeProcesoParaEvaluacion({ tenantId: tenantId ?? '', procesoId: procesoId ?? '' }).catch(() => null)
    : null
  const results = await obtenerResultadosEvaluacionParaEvaluador({ tenantId: tenantId ?? '', procesoId: procesoId ?? '' }).catch(() => null)
  const criteria = results?.criteria ?? await obtenerCriteriosEvaluacionParaEvaluador({ tenantId: tenantId ?? '', procesoId: procesoId ?? '' }).catch(() => [])
  return { proceso, subasta, results, criteria }
}

export function guardarCriteriosEvaluacionMutation(params: { tenantId: string; procesoId: string; userId: string; criteria: any[] }) {
  return guardarCriteriosEvaluacionParaEvaluador(params)
}

export function evaluarProveedoresMutation(params: { tenantId: string; procesoId: string; evaluatorId: string; supplierEvaluations: any[] }) {
  return evaluarProveedores(params)
}
