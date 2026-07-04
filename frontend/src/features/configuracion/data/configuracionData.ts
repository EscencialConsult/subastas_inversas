import {
  activarPlantillaDocumento,
  actualizarCircuitoAprobacion,
  actualizarModalidadContratacion,
  crearCircuitoAprobacion,
  crearModalidadContratacion,
  crearVersionPlantillaDocumento,
  eliminarCircuitoAprobacion,
  eliminarModalidadContratacion,
  listarCircuitosAprobacion,
  listarModalidadesContratacion,
  listarPlantillasDocumento,
  type CircuitoDatos,
  type ModalidadDatos,
  type PlantillaDatos,
} from '../../../shared/api/configuracionApi'

export const configuracionKeys = {
  all: ['configuracion'] as const,
  tenant: (tenantId?: string | null) => [...configuracionKeys.all, tenantId ?? ''] as const,
}

export async function configuracionQuery({ tenantId }: { tenantId?: string | null }) {
  const id = tenantId ?? ''
  const [modalidades, circuitos, plantillas] = await Promise.all([
    listarModalidadesContratacion({ tenantId: id }),
    listarCircuitosAprobacion({ tenantId: id }),
    listarPlantillasDocumento({ tenantId: id }),
  ])
  return { modalidades, circuitos, plantillas }
}

export function guardarModalidadMutation({ tenantId, id, datos }: { tenantId: string; id?: string | null; datos: ModalidadDatos }) {
  return id ? actualizarModalidadContratacion({ tenantId, id, datos }) : crearModalidadContratacion({ tenantId, datos })
}

export function eliminarModalidadMutation(params: { tenantId: string; id: string }) {
  return eliminarModalidadContratacion(params)
}

export function guardarCircuitoMutation({ tenantId, id, datos }: { tenantId: string; id?: string | null; datos: CircuitoDatos }) {
  return id ? actualizarCircuitoAprobacion({ tenantId, id, datos }) : crearCircuitoAprobacion({ tenantId, datos })
}

export function eliminarCircuitoMutation(params: { tenantId: string; id: string }) {
  return eliminarCircuitoAprobacion(params)
}

export function crearPlantillaMutation(params: { tenantId: string; datos: PlantillaDatos }) {
  return crearVersionPlantillaDocumento(params)
}

export function activarPlantillaMutation(params: { tenantId: string; id: string }) {
  return activarPlantillaDocumento(params)
}
