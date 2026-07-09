import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { ESTADO_INFO, etiquetaEstado, claseEstado } from '../../domain/compras'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { DataTable, type DataTableColumn } from '../../shared/ui/DataTable'
import { FormSection } from '../../shared/ui/FormSection'
import { Input } from '../../shared/ui/Input'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { Pagination, usePagination } from '../../shared/ui/Pagination'
import { Select } from '../../shared/ui/Select'
import { listarSubastasRealizadasQuery, subastaKeys } from './data/subastaData'

type SubastaRow = {
  procesoId: string
  codigo: string
  titulo: string
  oferentes: number
  mejor: number
  base: number
  bajaPorcentaje: number
  nivelBaja: string
  proveedorAdjudicado?: string | null
  estadoProceso?: string | null
}

export function SubastasRealizadasPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const subastasQuery = useQuery({
    queryKey: subastaKeys.realizadas({ tenantId, busqueda, estado }),
    queryFn: () => listarSubastasRealizadasQuery({ tenantId, busqueda, estado }),
    enabled: Boolean(tenantId),
    placeholderData: (previousData) => previousData,
  })
  const subastas = (subastasQuery.data ?? []) as SubastaRow[]
  const error = getErrorMessage(subastasQuery.error, '')
  const { paginatedItems, setPage, setPageSize, ...paginacion } = usePagination(subastas as (SubastaRow & Record<string, unknown>)[])

  function exportarCSV() {
    const cabecera = [
      'Código',
      'Título',
      'Oferentes',
      'Presupuesto base',
      'Mejor oferta',
      'Baja %',
      'Adjudicado a',
      'Estado',
    ]
    const lineas = subastas.map((s) => [
      s.codigo,
      s.titulo,
      s.oferentes,
      s.base,
      s.mejor,
      s.bajaPorcentaje.toFixed(1),
      s.proveedorAdjudicado ?? '',
      etiquetaEstado(s.estadoProceso),
    ])

    const csv = [cabecera, ...lineas]
      .map((fila) => fila.map(celdaCSV).join(';'))
      .join('\r\n')

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'subastas-realizadas.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns: Array<DataTableColumn<SubastaRow & Record<string, unknown>>> = [
    {
      header: 'Código',
      cell: (row) => <code>{row.codigo}</code>,
    },
    { header: 'Título', accessor: 'titulo', sortable: true },
    { header: 'Oferentes', accessor: 'oferentes' },
    {
      header: 'Mejor oferta',
      sortValue: (row) => row.mejor,
      cell: (row) => formatearPesos(row.mejor),
    },
    {
      header: 'Baja',
      cell: (row) => (
        <Badge variant={claseBaja(row.nivelBaja)}>
          {row.bajaPorcentaje.toFixed(1)}%
        </Badge>
      ),
    },
    {
      header: 'Adjudicado a',
      cell: (row) => <>{row.proveedorAdjudicado ?? '—'}</>,
    },
    {
      header: 'Estado',
      cell: (row) =>
        row.estadoProceso ? (
          <Badge variant={claseEstado(row.estadoProceso)}>
            {etiquetaEstado(row.estadoProceso)}
          </Badge>
        ) : null,
    },
    {
      header: '',
      align: 'right',
      cell: (row) => (
        <Button variant="ghost" onClick={() => navigate(`/auditoria/${row.procesoId}`)}>
          Ver expediente
        </Button>
      ),
    },
  ]

  return (
    <PageShell width="wide">
      <PageHeader
        title="Subastas realizadas"
        actions={
          <Button onClick={exportarCSV} disabled={subastas.length === 0}>
            Exportar CSV
          </Button>
        }
      />

      <FormSection title="Filtros">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <Input
            placeholder="Buscar por código, título o proveedor…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_INFO).map(([clave, info]) => (
              <option key={clave} value={clave}>
                {info.label}
              </option>
            ))}
          </Select>
        </div>
      </FormSection>

      {error && <Alert variant="error">{error}</Alert>}

      <DataTable
        columns={columns}
        rows={paginatedItems}
        loading={subastasQuery.isLoading || subastasQuery.isFetching}
        getRowId={(row) => row.procesoId}
        emptyTitle="Sin subastas"
        emptyDescription="No hay subastas que coincidan con el filtro."
      />
      <Pagination {...paginacion} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </PageShell>
  )
}

function celdaCSV(valor: unknown) {
  const texto = String(valor ?? '')
  if (/[";\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`
  }
  return texto
}

function claseBaja(nivel: string): 'success' | 'warning' | 'neutral' {
  if (nivel === 'alta') return 'success'
  if (nivel === 'moderada') return 'warning'
  return 'neutral'
}

function formatearPesos(monto: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
