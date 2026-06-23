import { apiFetch } from './client.js'

export async function listarEventosAuditoria({ tenantId, entityName = '', limit = 200 }) {
  const params = new URLSearchParams()
  if (tenantId) params.set('companyId', tenantId)
  if (entityName) params.set('entityName', entityName)
  params.set('limit', String(limit))

  const data = await apiFetch(`/audit/events?${params.toString()}`)
  return data.map((event) => ({
    id: event.id,
    sequence: event.sequence,
    companyId: event.companyId,
    entityName: event.entityName,
    entityId: event.entityId,
    action: event.action,
    payload: event.payload,
    createdAt: event.createdAtUtc,
    previousHash: event.previousHash,
    hash: event.hash,
  }))
}
