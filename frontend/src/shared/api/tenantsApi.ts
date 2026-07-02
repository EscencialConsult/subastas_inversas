import { apiFetch } from './client'
import { listarProcesos } from './comprasApi'
import { listarSubastasRealizadas } from './subastasApi'
import { listarUsuarios } from './usersApi'

interface CompanyResponse {
  id?: string
  name?: string
  domain?: string
  logo?: string | null
  primaryColor?: string | null
  isPublicEntity?: boolean
}

interface CompanyCreatedResponse {
  companyId?: string
  temporaryAdminPassword?: string
}

export interface TenantMapped {
  id: string
  nombre: string
  subdominio: string
  logo: string
  colorPrimario: string
  activo: boolean
  cantidadUsuarios?: number
}

export interface TenantInput {
  nombre: string
  subdominio: string
  logo?: string
  colorPrimario?: string
  activo: boolean
}

export interface TenantAdminInput {
  nombre: string
  apellido: string
  email: string
}

export async function listarTenants({ busqueda = '', estado = '' }: { busqueda?: string; estado?: string } = {}): Promise<TenantMapped[]> {
  const data = await apiFetch<CompanyResponse[] | { items: CompanyResponse[] }>('/api/companies')
  const items = Array.isArray(data) ? data : (data.items ?? [])

  let resultado: TenantMapped[] = items.map((c) => ({
    id: c.id ?? '',
    nombre: c.name ?? '',
    subdominio: c.domain ?? '',
    logo: c.logo ?? '',
    colorPrimario: c.primaryColor ?? '',
    activo: Boolean(c.isPublicEntity),
    cantidadUsuarios: 0, // placeholder; se puede resolver dinámicamente si es necesario
  }))

  if (busqueda.trim()) {
    const q = busqueda.trim().toLowerCase()
    resultado = resultado.filter((t) =>
      `${t.nombre} ${t.subdominio}`.toLowerCase().includes(q),
    )
  }
  if (estado) {
    resultado = resultado.filter((t) => t.activo === (estado === 'activos'))
  }

  return resultado
}

export async function obtenerTenant({ id }: { id: string }): Promise<TenantMapped> {
  const c = await apiFetch<CompanyResponse>(`/api/companies/${id}`)
  return {
    id: c.id ?? '',
    nombre: c.name ?? '',
    subdominio: c.domain ?? '',
    logo: c.logo ?? '',
    colorPrimario: c.primaryColor ?? '',
    activo: Boolean(c.isPublicEntity),
  }
}

export async function obtenerDetalleEmpresa({ id }: { id: string }) {
  const [tenant, usuarios, procesos, subastas] = await Promise.all([
    obtenerTenant({ id }),
    listarUsuarios({ tenantId: id }),
    listarProcesos({ tenantId: id }),
    listarSubastasRealizadas({ tenantId: id }),
  ])

  const conAhorro = subastas.filter((s) => Number.isFinite(s.bajaPorcentaje))
  const ahorroProm = conAhorro.length
    ? Math.round(conAhorro.reduce((acc, s) => acc + s.bajaPorcentaje, 0) / conAhorro.length)
    : null

  return {
    tenant,
    stats: {
      usuarios: usuarios.length,
      activos: usuarios.filter((u) => u.activo).length,
      procesos: procesos.length,
      subastas: subastas.length,
      ahorroProm,
    },
    usuarios,
  }
}

export async function crearTenant({ datos, admin }: { datos: TenantInput; admin: TenantAdminInput }) {
  const resultado = await apiFetch<CompanyCreatedResponse>('/api/companies/with-admin', {
    method: 'POST',
    body: JSON.stringify({
      name: datos.nombre,
      domain: datos.subdominio,
      logo: datos.logo || null,
      primaryColor: datos.colorPrimario || null,
      isPublicEntity: datos.activo,
      adminFirstName: admin.nombre,
      adminLastName: admin.apellido,
      adminEmail: admin.email,
    }),
  })

  return {
    tenant: {
      id: resultado.companyId,
      nombre: datos.nombre,
      subdominio: datos.subdominio,
      logo: datos.logo,
      colorPrimario: datos.colorPrimario,
      activo: datos.activo,
    },
    passwordTemporal: resultado.temporaryAdminPassword,
    admin: {
      nombre: admin.nombre,
      apellido: admin.apellido,
      email: admin.email,
    },
  }
}

export async function actualizarTenant({ id, datos }: { id: string; datos: TenantInput }): Promise<TenantMapped> {
  await apiFetch(`/api/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      id: id,
      name: datos.nombre,
      domain: datos.subdominio,
      logo: datos.logo || null,
      primaryColor: datos.colorPrimario || null,
      isPublicEntity: datos.activo,
    }),
  })

  return {
    id,
    nombre: datos.nombre,
    subdominio: datos.subdominio,
    logo: datos.logo ?? '',
    colorPrimario: datos.colorPrimario ?? '',
    activo: datos.activo,
  }
}

export async function cambiarEstadoTenant({ id, activo }: { id: string; activo: boolean }): Promise<TenantMapped> {
  // Trae los datos actuales para no pisar otros campos
  const c = await apiFetch<CompanyResponse>(`/api/companies/${id}`)
  c.isPublicEntity = activo

  await apiFetch(`/api/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(c),
  })

  return {
    id,
    nombre: c.name ?? '',
    subdominio: c.domain ?? '',
    logo: c.logo ?? '',
    colorPrimario: c.primaryColor ?? '',
    activo: Boolean(c.isPublicEntity),
  }
}
