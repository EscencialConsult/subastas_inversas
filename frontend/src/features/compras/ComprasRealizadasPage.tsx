// Compras realizadas (legajos): archivo de compras adjudicadas/aprobadas.

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Package } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { etiquetaEstado, claseEstado } from '../../domain/compras'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import { Input } from '../../shared/ui/Input'
import { Pagination, usePagination } from '../../shared/ui/Pagination'
import { Spinner } from '../../shared/ui/Spinner'
import { Table } from '../../shared/ui/Table'
import { listarComprasRealizadasQuery, procesosKeys } from './data/procesosData'

export function ComprasRealizadasPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [busqueda, setBusqueda] = useState('')
  const comprasQuery = useQuery({
    queryKey: procesosKeys.comprasRealizadas({ tenantId, busqueda }),
    queryFn: () => listarComprasRealizadasQuery({ tenantId, busqueda }),
    enabled: Boolean(tenantId),
    placeholderData: (previousData) => previousData,
  })

  const compras = comprasQuery.data ?? []
  const error = getErrorMessage(comprasQuery.error, '')
  const { paginatedItems, setPage, setPageSize, ...paginacion } = usePagination(compras)

  return (
    <section>
      <div className="encabezado">
        <h1>Compras realizadas</h1>
      </div>

      <div className="filtros">
        <Input
          className="filtros__busqueda"
          placeholder="Buscar por codigo, titulo o proveedor..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {comprasQuery.isLoading || comprasQuery.isFetching ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : compras.length === 0 ? (
        <EmptyState icon={Package} title="Sin compras" description="Todavia no hay compras realizadas." />
      ) : (
        <>
          <Table
            data={paginatedItems}
            columns={[
              { header: 'Codigo', accessor: 'codigo', render: (valor) => <code>{String(valor ?? '')}</code> },
              { header: 'Titulo', accessor: 'titulo' },
              { header: 'Proveedor', accessor: 'proveedor' },
              { header: 'Monto', accessor: 'monto', render: (valor) => formatearPesos(Number(valor) || 0) },
              { header: 'Fecha', accessor: 'fecha' },
              {
                header: 'Estado',
                accessor: 'estado',
                render: (valor) => <Badge variant={claseEstado(String(valor))}>{etiquetaEstado(String(valor))}</Badge>,
              },
              {
                header: '',
                accessor: 'acciones',
                sortKey: false,
                render: (_, compra) => (
                  <Button variant="ghost" onClick={() => navigate(`/compras/${compra.id}`)}>
                    Ver legajo
                  </Button>
                ),
              },
            ]}
          />
          <Pagination {...paginacion} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </>
      )}
    </section>
  )
}

function formatearPesos(monto: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
