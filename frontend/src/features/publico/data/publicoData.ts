import {
  listarAdjudicacionesPublicas,
  listarProcesosPublicos,
  listarSubastasPublicas,
  obtenerProcesoPublico,
  obtenerSubastaPublica,
} from '../../../shared/api/publicoApi'

export interface PortalPublicoParams {
  busqueda?: string
  estado?: string
}

export const publicoKeys = {
  all: ['publico'] as const,
  portal: (params: PortalPublicoParams) => [...publicoKeys.all, 'portal', params] as const,
  proceso: (procesoId?: string | null) => [...publicoKeys.all, 'proceso', procesoId ?? ''] as const,
  subasta: (procesoId?: string | null) => [...publicoKeys.all, 'subasta', procesoId ?? ''] as const,
}

export async function portalPublicoQuery(params: PortalPublicoParams) {
  const [procesos, subastas, adjudicaciones] = await Promise.all([
    listarProcesosPublicos(params),
    listarSubastasPublicas(),
    listarAdjudicacionesPublicas({ busqueda: params.busqueda ?? '' }),
  ])
  return { procesos, subastas, adjudicaciones }
}

export function obtenerProcesoPublicoQuery({ procesoId }: { procesoId?: string | null }) {
  return obtenerProcesoPublico({ procesoId: procesoId ?? '' })
}

export function obtenerSubastaPublicaQuery({ procesoId }: { procesoId?: string | null }) {
  return obtenerSubastaPublica({ procesoId: procesoId ?? '' })
}
