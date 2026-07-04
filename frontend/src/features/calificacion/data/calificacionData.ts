import {
  calificarProveedor,
  descargarActaEvaluacionUrl,
  firmarActaEvaluacion,
  listarProcesosParaCalificacion,
  obtenerProcesoParaEvaluacion,
  obtenerProveedoresDeProceso,
} from '../../../shared/api/comprasApi'

export const calificacionKeys = {
  all: ['calificacion'] as const,
  lists: () => [...calificacionKeys.all, 'list'] as const,
  list: (params: { tenantId?: string | null; busqueda?: string }) => [...calificacionKeys.lists(), params] as const,
  detail: (tenantId?: string | null, procesoId?: string | null) => [...calificacionKeys.all, 'detail', tenantId ?? '', procesoId ?? ''] as const,
}

export function listarProcesosCalificacionQuery(params: { tenantId?: string | null; busqueda?: string }) {
  return listarProcesosParaCalificacion({ tenantId: params.tenantId ?? '', busqueda: params.busqueda ?? '' })
}

export async function calificacionProcesoQuery({ tenantId, procesoId }: { tenantId?: string | null; procesoId?: string | null }) {
  const [proceso, proveedores] = await Promise.all([
    obtenerProcesoParaEvaluacion({ tenantId: tenantId ?? '', id: procesoId ?? '' }),
    obtenerProveedoresDeProceso({ tenantId: tenantId ?? '', procesoId: procesoId ?? '' }),
  ])
  return { proceso, proveedores }
}

export async function calificacionProveedorQuery({
  tenantId,
  procesoId,
  invitationId,
}: {
  tenantId?: string | null
  procesoId?: string | null
  invitationId?: string | null
}) {
  const data = await calificacionProcesoQuery({ tenantId, procesoId })
  const proveedor = data.proveedores.find((supplier: any) => supplier.invitationId === invitationId) ?? null
  return { ...data, proveedor }
}

export function calificarProveedorMutation(params: {
  tenantId: string
  procesoId: string
  invitationId: string
  evaluatorId: string
  qualificationStatus: string | number
  notes: string
}) {
  return calificarProveedor(params)
}

export function firmarActaEvaluacionMutation(params: {
  tenantId: string
  procesoId: string
  evaluatorId: string
  signatureImage: string
}) {
  return firmarActaEvaluacion(params)
}

export function descargarActaEvaluacionHref(params: { tenantId?: string | null; procesoId?: string | null }) {
  return descargarActaEvaluacionUrl({ tenantId: params.tenantId ?? '', procesoId: params.procesoId ?? '' })
}
