import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { TenantMapped } from '../../shared/api/tenantsApi'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { DataTable, type DataTableColumn } from '../../shared/ui/DataTable'
import { FormSection } from '../../shared/ui/FormSection'
import { Input } from '../../shared/ui/Input'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
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

  const tenants = (tenantsQuery.data ?? []) as TenantMapped[]
  const error = getErrorMessage(tenantsQuery.error ?? cambiarEstado.error, '')

  function alternarEstado(tenant: TenantMapped) {
    cambiarEstado.mutate({ id: tenant.id, activo: !tenant.activo })
  }

  const columns: Array<DataTableColumn<TenantMapped & Record<string, unknown>>> = [
    { header: 'Nombre', accessor: 'nombre', sortable: true },
    {
      header: 'Subdominio',
      cell: (row) => <code>{row.subdominio}</code>,
    },
    { header: 'Usuarios', accessor: 'cantidadUsuarios' },
    {
      header: 'Estado',
      cell: (row) => (
        <Badge variant={row.activo ? 'success' : 'neutral'}>
          {row.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      header: '',
      align: 'right',
      cell: (row) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/tenants/${row.id}/detalle`)}>
            Detalle
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/tenants/${row.id}`)}>
            Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => alternarEstado(row)}>
            {row.activo ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <PageShell width="wide">
      <PageHeader
        title="Tenants"
        actions={<Button onClick={() => navigate('/tenants/nuevo')}>+ Nuevo tenant</Button>}
      />

      <FormSection title="Filtros">
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
      </FormSection>

      {error && <Alert variant="error">{error}</Alert>}

      <DataTable
        columns={columns}
        rows={tenants as (TenantMapped & Record<string, unknown>)[]}
        loading={tenantsQuery.isLoading || tenantsQuery.isFetching}
        getRowId={(row) => row.id}
        pageSize={10}
        emptyTitle="Sin empresas"
        emptyDescription="No hay tenants que coincidan con el filtro."
      />
    </PageShell>
  )
}
