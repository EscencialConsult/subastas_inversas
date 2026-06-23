import { apiFetch } from './client.js'

export async function listarTenants({ busqueda = '', estado = '' } = {}) {
  const data = await apiFetch('/api/companies')
  
  let resultado = data.map((c) => ({
    id: c.id,
    nombre: c.name,
    subdominio: c.domain,
    activo: c.isPublicEntity,
    cantidadUsuarios: 0 // Set placeholder, can be resolved dynamically if needed
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

export async function obtenerTenant({ id }) {
  const c = await apiFetch(`/api/companies/${id}`)
  return {
    id: c.id,
    nombre: c.name,
    subdominio: c.domain,
    activo: c.isPublicEntity
  }
}

export async function crearTenant({ datos, admin }) {
  const companyId = await apiFetch('/api/companies/with-admin', {
    method: 'POST',
    body: JSON.stringify({
      name: datos.nombre,
      domain: datos.subdominio,
      isPublicEntity: datos.activo,
      adminFirstName: admin.nombre,
      adminLastName: admin.apellido,
      adminEmail: admin.email
    })
  })

  return {
    tenant: {
      id: companyId,
      nombre: datos.nombre,
      subdominio: datos.subdominio,
      activo: datos.activo
    },
    admin: {
      nombre: admin.nombre,
      apellido: admin.apellido,
      email: admin.email
    }
  }
}

export async function actualizarTenant({ id, datos }) {
  await apiFetch(`/api/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      id: id,
      name: datos.nombre,
      domain: datos.subdominio,
      isPublicEntity: datos.activo
    })
  })

  return {
    id,
    nombre: datos.nombre,
    subdominio: datos.subdominio,
    activo: datos.activo
  }
}

export async function cambiarEstadoTenant({ id, activo }) {
  // Fetch existing details first
  const c = await apiFetch(`/api/companies/${id}`)
  
  // Update state
  c.isPublicEntity = activo

  // Put updated object
  await apiFetch(`/api/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(c)
  })

  return {
    id,
    nombre: c.name,
    subdominio: c.domain,
    activo: c.isPublicEntity
  }
}
