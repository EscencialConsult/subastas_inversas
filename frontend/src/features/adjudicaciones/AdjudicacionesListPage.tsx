import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { ESTADO_PROCESO, claseEstado, etiquetaEstado } from '../../domain/compras'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { DataTable, type DataTableColumn } from '../../shared/ui/DataTable'
import { FormSection } from '../../shared/ui/FormSection'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { Select } from '../../shared/ui/Select'
import { adjudicacionesKeys, listarAdjudicacionesQuery } from './data/adjudicacionesData'

type ProcesoRow = {
  id: string
  codigo: string
  titulo: string
  estado: string
  adjudicacion?: { proveedor?: string } | null
}

const FILTROS: Record<string, string> = {
  pendientes: ESTADO_PROCESO.ADJUDICADA,
  aprobadas: ESTADO_PROCESO.APROBADA,
  todas: '',
}

export function AdjudicacionesListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [filtro, setFiltro] = useState('pendientes')
  const estado = FILTROS[filtro]
  const procesosQuery = useQuery({
    queryKey: adjudicacionesKeys.list({ tenantId, estado }),
    queryFn: () => listarAdjudicacionesQuery({ tenantId, estado }),
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
      header: 'Proveedor adjudicado',
      cell: (row) => <>{row.adjudicacion?.proveedor ?? '-'}</>,
    },
    {
      header: 'Estado',
      cell: (row) => <Badge variant={claseEstado(row.estado)}>{etiquetaEstado(row.estado)}</Badge>,
    },
    {
      header: '',
      align: 'right',
      cell: (row) => (
        <Button variant="ghost" onClick={() => navigate(`/adjudicaciones/${row.id}`)}>
          {row.estado === ESTADO_PROCESO.ADJUDICADA ? 'Revisar' : 'Ver'}
        </Button>
      ),
    },
  ]

  return (
    <PageShell width="wide">
      <PageHeader title="Adjudicaciones" />

      <FormSection title="Filtros">
        <Select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="pendientes">Pendientes</option>
          <option value="aprobadas">Aprobadas</option>
          <option value="todas">Todas</option>
        </Select>
      </FormSection>

      {error && <Alert variant="error">{error}</Alert>}

      <DataTable
        columns={columns}
        rows={procesos as (ProcesoRow & Record<string, unknown>)[]}
        loading={procesosQuery.isLoading || procesosQuery.isFetching}
        getRowId={(row) => row.id}
        pageSize={10}
        emptyTitle="Sin adjudicaciones"
        emptyDescription="No hay adjudicaciones para el filtro seleccionado."
      />
    </PageShell>
  )
}
