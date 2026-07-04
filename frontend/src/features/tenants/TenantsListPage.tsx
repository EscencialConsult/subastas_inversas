// Listado de tenants (empresas/municipios cliente). Solo super-admin.

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { TenantMapped } from '../../shared/api/tenantsApi'
import { Building2 } from 'lucide-react'
import { Alert } from '../../shared/ui/Alert'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Spinner } from '../../shared/ui/Spinner'
import { EmptyState } from '../../shared/ui/EmptyState'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { Pagination, usePagination } from '../../shared/ui/Pagination'
import { Select } from '../../shared/ui/Select'
import { cambiarEstadoTenantMutation, listarTenantsQuery, tenantsKeys, type TenantsListParams } from './data/tenantsData'

export function TenantsListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')

  const filtros: TenantsListParams = { busqueda, estado }
  const tenantsQuery = useQuery({
    queryKey: tenantsKeys.list(filtros),
    queryFn: () => listarTenantsQuery(filtros),
    placeholderData: (previousData) => previousData,
  })

  const cambiarEstado = useMutation({
    mutationFn: cambiarEstadoTenantMutation,
    onMutate: async ({ id, activo }) => {
      await queryClient.cancelQueries({ queryKey: tenantsKeys.lists() })
      const snapshots = queryClient.getQueriesData<TenantMapped[]>({ queryKey: tenantsKeys.lists() })
      snapshots.forEach(([key, data]) => {
        if (!data) return
        queryClient.setQueryData<TenantMapped[]>(key, data.map((tenant) => (tenant.id === id ? { ...tenant, activo } : tenant)))
      })
      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSettled: async (_data, _error, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tenantsKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: tenantsKeys.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: tenantsKeys.companyDetail(variables.id) }),
      ])
    },
  })

  const tenants = tenantsQuery.data ?? []
  const tenantsPagination = usePagination(tenants, { initialPageSize: 10 })

  function alternarEstado(tenant: TenantMapped) {
    cambiarEstado.mutate({ id: tenant.id, activo: !tenant.activo })
  }

  const error = getErrorMessage(tenantsQuery.error ?? cambiarEstado.error, '')

  return (
    <PageShell width="wide">
      <PageHeader
        title="Tenants"
        actions={<Button onClick={() => navigate('/tenants/nuevo')}>+ Nuevo tenant</Button>}
      />

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <Input
          placeholder="Buscar por nombre o subdominio…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </Select>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {tenantsQuery.isLoading || tenantsQuery.isFetching ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : tenants.length === 0 ? (
        <EmptyState icon={Building2} title="Sin empresas" description="No hay tenants que coincidan con el filtro." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-sm">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Subdominio</th>
                <th className="px-4 py-3">Usuarios</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenantsPagination.paginatedItems.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-medium text-text">{t.nombre}</td>
                  <td className="px-4 py-3">
                    <code>{t.subdominio}</code>
                  </td>
                  <td className="px-4 py-3">{t.cantidadUsuarios}</td>
                  <td className="px-4 py-3">
                    <Badge variant={t.activo ? 'success' : 'neutral'}>
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="ghost" onClick={() => navigate(`/tenants/${t.id}/detalle`)}>
                      Detalle
                    </Button>
                    <Button variant="ghost" onClick={() => navigate(`/tenants/${t.id}`)}>
                      Editar
                    </Button>
                    <Button variant="ghost" onClick={() => alternarEstado(t)}>
                      {t.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <Pagination
            page={tenantsPagination.page}
            pageSize={tenantsPagination.pageSize}
            totalItems={tenantsPagination.totalItems}
            totalPages={tenantsPagination.totalPages}
            onPageChange={tenantsPagination.setPage}
            onPageSizeChange={tenantsPagination.setPageSize}
          />
        </>
      )}
    </PageShell>
  )
}
