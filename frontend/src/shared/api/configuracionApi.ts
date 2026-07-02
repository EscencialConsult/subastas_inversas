import { apiFetch, ApiError } from './client'
import type { components } from './schema'

export type ContractingModeDto = components["schemas"]["ContractingModeDto"]
export type ApprovalWorkflowDto = components["schemas"]["ApprovalWorkflowDto"]
export type DocumentTemplateDto = components["schemas"]["DocumentTemplateDto"]

export interface ModalidadDatos {
  name: string
  description?: string
  minAmount: number | string
  maxAmount?: number | string | null
  requiresAuction: boolean
  active: boolean
}

export interface CircuitoNivel {
  requiredRole: number | string
  amountThreshold: number | string
}

export interface CircuitoDatos {
  name: string
  minAmount?: number | string | null
  maxAmount?: number | string | null
  active: boolean
  levels: CircuitoNivel[]
}

export interface PlantillaDatos {
  type: number | string
  name: string
  content: string
  activate?: boolean
}

export async function listarModalidadesContratacion({ tenantId }: { tenantId: string }): Promise<ContractingModeDto[]> {
  return apiFetch<ContractingModeDto[]>(`/api/companies/${tenantId}/configuration/contracting-modes`)
}

export async function crearModalidadContratacion({ tenantId, datos }: { tenantId: string; datos: ModalidadDatos }): Promise<ContractingModeDto> {
  validarModalidad(datos)

  return apiFetch<ContractingModeDto>(`/api/companies/${tenantId}/configuration/contracting-modes`, {
    method: 'POST',
    body: mapModalidadPayload(tenantId, datos),
  })
}

export async function actualizarModalidadContratacion({ tenantId, id, datos }: { tenantId: string; id: string; datos: ModalidadDatos }): Promise<ContractingModeDto> {
  validarModalidad(datos)

  return apiFetch<ContractingModeDto>(`/api/companies/${tenantId}/configuration/contracting-modes/${id}`, {
    method: 'PUT',
    body: {
      id,
      ...mapModalidadPayload(tenantId, datos),
    },
  })
}

export async function eliminarModalidadContratacion({ tenantId, id }: { tenantId: string; id: string }): Promise<void> {
  await apiFetch<void>(`/api/companies/${tenantId}/configuration/contracting-modes/${id}`, {
    method: 'DELETE',
  })
}

export async function listarCircuitosAprobacion({ tenantId }: { tenantId: string }): Promise<ApprovalWorkflowDto[]> {
  return apiFetch<ApprovalWorkflowDto[]>(`/api/companies/${tenantId}/configuration/approval-workflows`)
}

export async function crearCircuitoAprobacion({ tenantId, datos }: { tenantId: string; datos: CircuitoDatos }): Promise<ApprovalWorkflowDto> {
  validarCircuito(datos)

  return apiFetch<ApprovalWorkflowDto>(`/api/companies/${tenantId}/configuration/approval-workflows`, {
    method: 'POST',
    body: mapCircuitoPayload(tenantId, datos),
  })
}

export async function actualizarCircuitoAprobacion({ tenantId, id, datos }: { tenantId: string; id: string; datos: CircuitoDatos }): Promise<ApprovalWorkflowDto> {
  validarCircuito(datos)

  return apiFetch<ApprovalWorkflowDto>(`/api/companies/${tenantId}/configuration/approval-workflows/${id}`, {
    method: 'PUT',
    body: {
      id,
      ...mapCircuitoPayload(tenantId, datos),
    },
  })
}

export async function eliminarCircuitoAprobacion({ tenantId, id }: { tenantId: string; id: string }): Promise<void> {
  await apiFetch<void>(`/api/companies/${tenantId}/configuration/approval-workflows/${id}`, {
    method: 'DELETE',
  })
}

export async function listarPlantillasDocumento({ tenantId, tipo = '' }: { tenantId: string; tipo?: string }): Promise<DocumentTemplateDto[]> {
  const query = tipo ? `?type=${tipo}` : ''
  return apiFetch<DocumentTemplateDto[]>(`/api/companies/${tenantId}/configuration/document-templates${query}`)
}

export async function crearVersionPlantillaDocumento({ tenantId, datos }: { tenantId: string; datos: PlantillaDatos }): Promise<DocumentTemplateDto> {
  validarPlantilla(datos)

  return apiFetch<DocumentTemplateDto>(`/api/companies/${tenantId}/configuration/document-templates`, {
    method: 'POST',
    body: {
      companyId: tenantId,
      type: Number(datos.type),
      name: datos.name.trim(),
      content: datos.content.trim(),
      activate: Boolean(datos.activate),
    },
  })
}

export async function activarPlantillaDocumento({ tenantId, id }: { tenantId: string; id: string }): Promise<DocumentTemplateDto> {
  return apiFetch<DocumentTemplateDto>(`/api/companies/${tenantId}/configuration/document-templates/${id}/activate`, {
    method: 'POST',
  })
}

function mapModalidadPayload(tenantId: string, datos: ModalidadDatos) {
  return {
    companyId: tenantId,
    name: datos.name.trim(),
    description: datos.description?.trim() ?? '',
    minAmount: Number(datos.minAmount) || 0,
    maxAmount: datos.maxAmount === '' || datos.maxAmount == null ? null : Number(datos.maxAmount),
    requiresAuction: Boolean(datos.requiresAuction),
    active: Boolean(datos.active),
  }
}

function validarModalidad(datos: ModalidadDatos) {
  if (!datos.name?.trim()) throw new ApiError('El nombre de la modalidad es obligatorio.', 422)

  const minAmount = Number(datos.minAmount)
  if (!Number.isFinite(minAmount) || minAmount < 0) {
    throw new ApiError('El monto minimo no puede ser negativo.', 422)
  }

  if (datos.maxAmount !== '' && datos.maxAmount != null) {
    const maxAmount = Number(datos.maxAmount)
    if (!Number.isFinite(maxAmount) || maxAmount < minAmount) {
      throw new ApiError('El monto maximo no puede ser menor al minimo.', 422)
    }
  }
}

function mapCircuitoPayload(tenantId: string, datos: CircuitoDatos) {
  const levels = datos.levels.map((level, index) => ({
    levelOrder: index + 1,
    requiredRole: Number(level.requiredRole),
    amountThreshold: Number(level.amountThreshold) || 0,
  }))

  return {
    companyId: tenantId,
    name: datos.name.trim(),
    minAmount: datos.minAmount === '' || datos.minAmount == null ? null : Number(datos.minAmount),
    maxAmount: datos.maxAmount === '' || datos.maxAmount == null ? null : Number(datos.maxAmount),
    requiredRole: levels[0]?.requiredRole ?? 6,
    requiredApprovals: levels.length,
    active: Boolean(datos.active),
    levels,
  }
}

function validarCircuito(datos: CircuitoDatos) {
  if (!datos.name?.trim()) throw new ApiError('El nombre del circuito es obligatorio.', 422)

  const minAmount = datos.minAmount === '' || datos.minAmount == null ? null : Number(datos.minAmount)
  const maxAmount = datos.maxAmount === '' || datos.maxAmount == null ? null : Number(datos.maxAmount)

  if (minAmount != null && (!Number.isFinite(minAmount) || minAmount < 0)) {
    throw new ApiError('El monto minimo no puede ser negativo.', 422)
  }

  if (maxAmount != null && (!Number.isFinite(maxAmount) || maxAmount < 0)) {
    throw new ApiError('El monto maximo no puede ser negativo.', 422)
  }

  if (minAmount != null && maxAmount != null && maxAmount < minAmount) {
    throw new ApiError('El monto maximo no puede ser menor al minimo.', 422)
  }

  if (!datos.levels.length) throw new ApiError('El circuito requiere al menos un nivel.', 422)

  for (const level of datos.levels) {
    const threshold = Number(level.amountThreshold)
    if (!Number.isFinite(threshold) || threshold < 0) {
      throw new ApiError('El umbral de cada nivel no puede ser negativo.', 422)
    }
  }
}

function validarPlantilla(datos: PlantillaDatos) {
  if (!datos.name?.trim()) throw new ApiError('El nombre de la plantilla es obligatorio.', 422)
  if (!datos.content?.trim()) throw new ApiError('El contenido de la plantilla es obligatorio.', 422)
}
