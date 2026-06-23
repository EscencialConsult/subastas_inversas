import { apiFetch } from './client.js'

export async function obtenerConfiguracionEmpresa({ tenantId }) {
  return apiFetch(`/api/companies/${tenantId}/configuration`)
}

export async function guardarConfiguracionEmpresa({ tenantId, datos }) {
  return apiFetch(`/api/companies/${tenantId}/configuration`, {
    method: 'PUT',
    body: JSON.stringify({
      companyId: tenantId,
      defaultCurrency: datos.defaultCurrency,
      timeZone: datos.timeZone,
      minimumBidDecrementPercentage: Number(datos.minimumBidDecrementPercentage),
      auctionExtensionMinutes: Number(datos.auctionExtensionMinutes),
      requireSupplierVerification: Boolean(datos.requireSupplierVerification),
    }),
  })
}

export async function listarModalidades({ tenantId }) {
  return apiFetch(`/api/companies/${tenantId}/configuration/contracting-modes`)
}

export async function crearModalidad({ tenantId, datos }) {
  return apiFetch(`/api/companies/${tenantId}/configuration/contracting-modes`, {
    method: 'POST',
    body: JSON.stringify({
      companyId: tenantId,
      name: datos.name,
      description: datos.description,
      requiresAuction: Boolean(datos.requiresAuction),
      active: true,
    }),
  })
}

export async function listarCircuitos({ tenantId }) {
  return apiFetch(`/api/companies/${tenantId}/configuration/approval-workflows`)
}

export async function crearCircuito({ tenantId, datos }) {
  return apiFetch(`/api/companies/${tenantId}/configuration/approval-workflows`, {
    method: 'POST',
    body: JSON.stringify({
      companyId: tenantId,
      name: datos.name,
      minAmount: datos.minAmount ? Number(datos.minAmount) : null,
      maxAmount: datos.maxAmount ? Number(datos.maxAmount) : null,
      requiredRole: Number(datos.requiredRole),
      requiredApprovals: Number(datos.requiredApprovals),
      active: true,
    }),
  })
}
