export type EntityId = string
export type TenantId = string

export interface Usuario {
  id: EntityId
  nombre: string
  apellido: string
  email: string
  rol: string
  activo: boolean
  mfaActivo: boolean
  tenantId: TenantId | null
}

export interface UsuarioInput {
  nombre: string
  apellido: string
  email: string
  rol: string
  activo?: boolean
}

export interface PerfilInput {
  nombre: string
  apellido: string
  email: string
}

export interface CambioContrasenaInput {
  actual: string
  nueva: string
  repetir: string
}

export interface Tenant {
  id: TenantId
  nombre?: string
  razonSocial?: string
  cuit?: string
  activo?: boolean
  [key: string]: unknown
}

export interface ApiCollection<T> {
  items?: T[]
}
