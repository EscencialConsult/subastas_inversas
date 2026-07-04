import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { etiquetaEstado, claseEstado } from '../../domain/compras'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Badge } from '../../shared/ui/Badge'
import { Alert } from '../../shared/ui/Alert'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import { Input } from '../../shared/ui/Input'
import { Pagination, usePagination } from '../../shared/ui/Pagination'
import { Spinner } from '../../shared/ui/Spinner'
import { calificacionKeys, listarProcesosCalificacionQuery } from './data/calificacionData'

export function CalificacionListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [busqueda, setBusqueda] = useState('')
  const procesosQuery = useQuery({
    queryKey: calificacionKeys.list({ tenantId, busqueda }),
    queryFn: () => listarProcesosCalificacionQuery({ tenantId, busqueda }),
    enabled: Boolean(tenantId),
    placeholderData: (previousData) => previousData,
  })
  const procesos = procesosQuery.data ?? []
  const procesosPagination = usePagination(procesos, { initialPageSize: 10 })
  const error = getErrorMessage(procesosQuery.error, '')

  return (
    <section className="space-y-6">
      <div className="encabezado">
        <h1>Calificación de Proveedores</h1>
        <p className="text-sm text-text-muted">
          Califique los proveedores que aceptaron la invitación. Solo los <strong>Aprobados</strong> podrán participar en la subasta.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="barra-busqueda">
        <Input
          placeholder="Buscar por código o título..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {procesosQuery.isLoading || procesosQuery.isFetching ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : procesos.length === 0 ? (
        <EmptyState icon={SearchX} title="Sin procesos" description="No hay procesos con proveedores pendientes de calificación." />
      ) : (
        <>
        <table className="min-w-full divide-y divide-border text-sm">
          <thead>
            <tr>
              <th>Código</th>
              <th>Título</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {procesosPagination.paginatedItems.map(p => (
              <tr key={p.id}>
                <td><code>{p.codigo}</code></td>
                <td>{p.titulo}</td>
                <td>
                  <Badge variant={claseEstado(p.estado)}>{etiquetaEstado(p.estado)}</Badge>
                </td>
                <td>
                  <Button size="sm" onClick={() => navigate(`/calificacion/${p.id}`)}>
                    Calificar proveedores
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={procesosPagination.page}
          pageSize={procesosPagination.pageSize}
          totalItems={procesosPagination.totalItems}
          totalPages={procesosPagination.totalPages}
          onPageChange={procesosPagination.setPage}
          onPageSizeChange={procesosPagination.setPageSize}
        />
        </>
      )}
    </section>
  )
}
