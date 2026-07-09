import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { etiquetaEstado, claseEstado } from '../../domain/compras'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { DataTable, type DataTableColumn } from '../../shared/ui/DataTable'
import { Input } from '../../shared/ui/Input'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { Pagination, usePagination } from '../../shared/ui/Pagination'
import { evaluacionKeys, listarProcesosEvaluacionQuery } from './data/evaluacionData'

export function EvaluacionListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [busqueda, setBusqueda] = useState('')
  const procesosQuery = useQuery({
    queryKey: evaluacionKeys.list({ tenantId, busqueda }),
    queryFn: () => listarProcesosEvaluacionQuery({ tenantId, busqueda }),
    enabled: Boolean(tenantId),
    placeholderData: (previousData) => previousData,
  })
  const procesos = procesosQuery.data ?? []
  const error = getErrorMessage(procesosQuery.error, '')
  const { paginatedItems, setPage, setPageSize, ...paginacion } = usePagination(procesos as unknown as Record<string, unknown>[])

  const columns: Array<DataTableColumn<Record<string, unknown>>> = [
    {
      header: 'Código',
      cell: (row) => <code>{String(row.codigo ?? '---')}</code>,
    },
    { header: 'Título', accessor: 'titulo', sortable: true },
    {
      header: 'Estado',
      cell: (row) => <Badge variant={claseEstado(String(row.estado))}>{etiquetaEstado(String(row.estado))}</Badge>,
    },
    {
      header: '',
      align: 'right',
      cell: (row) => (
        <Button size="sm" onClick={() => navigate(`/evaluacion/${String(row.id)}`)}>
          Evaluar
        </Button>
      ),
    },
  ]

  return (
    <PageShell width="wide">
      <PageHeader
        title="Evaluación de procesos"
        description="Procesos pendientes de evaluación técnica y documental."
      />

      {error && <Alert variant="error">{error}</Alert>}

      <Input
        label="Buscar"
        placeholder="Buscar por código o título..."
        value={busqueda}
        onChange={(event) => setBusqueda(event.target.value)}
      />

      <DataTable
        columns={columns}
        rows={paginatedItems}
        loading={procesosQuery.isLoading || procesosQuery.isFetching}
        getRowId={(row) => String(row.id)}
        emptyTitle="Sin procesos"
        emptyDescription="No hay procesos pendientes de evaluación."
      />
      <Pagination {...paginacion} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </PageShell>
  )
}
