import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { puedeCalificarProveedores } from '../../auth/permisos'
import { claseEstado, etiquetaEstado } from '../../domain/compras'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { DataTable, type DataTableColumn } from '../../shared/ui/DataTable'
import { FormSection } from '../../shared/ui/FormSection'
import { Input } from '../../shared/ui/Input'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { calificacionKeys, listarProcesosCalificacionQuery } from './data/calificacionData'

type ProcesoRow = {
  id: string
  codigo: string
  titulo: string
  estado: string
}

export function CalificacionListPage() {
  const { tenantId, rol } = useAuth()
  const navigate = useNavigate()
  const puedeCalificar = puedeCalificarProveedores(rol)

  const [busqueda, setBusqueda] = useState('')
  const procesosQuery = useQuery({
    queryKey: calificacionKeys.list({ tenantId, busqueda }),
    queryFn: () => listarProcesosCalificacionQuery({ tenantId, busqueda }),
    enabled: Boolean(tenantId),
    placeholderData: (previousData) => previousData,
  })
  const procesos = (procesosQuery.data ?? []) as ProcesoRow[]
  const error = getErrorMessage(procesosQuery.error, '')

  const columns: Array<DataTableColumn<ProcesoRow & Record<string, unknown>>> = [
    {
      header: 'Código',
      cell: (row) => <code>{row.codigo}</code>,
    },
    { header: 'Título', accessor: 'titulo', sortable: true },
    {
      header: 'Estado',
      cell: (row) => <Badge variant={claseEstado(row.estado)}>{etiquetaEstado(row.estado)}</Badge>,
    },
    {
      header: '',
      align: 'right',
      cell: (row) => (
        <Button size="sm" onClick={() => navigate(`/calificacion/${row.id}`)}>
          {puedeCalificar ? 'Calificar proveedores' : 'Ver proveedores'}
        </Button>
      ),
    },
  ]

  return (
    <PageShell width="wide">
      <PageHeader
        title="Calificación de Proveedores"
        description="Califique los proveedores que aceptaron la invitación. Solo los Aprobados podrán participar en la subasta."
      />

      <FormSection title="Filtros">
        <Input
          placeholder="Buscar por código o título..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </FormSection>

      {error && <Alert variant="error">{error}</Alert>}

      <DataTable
        columns={columns}
        rows={procesos as (ProcesoRow & Record<string, unknown>)[]}
        loading={procesosQuery.isLoading || procesosQuery.isFetching}
        getRowId={(row) => row.id}
        pageSize={10}
        emptyTitle="Sin procesos"
        emptyDescription="No hay procesos con proveedores pendientes de calificación."
      />
    </PageShell>
  )
}
