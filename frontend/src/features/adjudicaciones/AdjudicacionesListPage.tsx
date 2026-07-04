// Listado para la Autoridad: permite revisar adjudicaciones pendientes y consultar las resueltas.

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { ESTADO_PROCESO, claseEstado, etiquetaEstado } from '../../domain/compras'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Badge } from '../../shared/ui/Badge'
import { Alert } from '../../shared/ui/Alert'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import { Pagination, usePagination } from '../../shared/ui/Pagination'
import { Select } from '../../shared/ui/Select'
import { Spinner } from '../../shared/ui/Spinner'
import { adjudicacionesKeys, listarAdjudicacionesQuery } from './data/adjudicacionesData'

const FILTROS = {
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
  const procesos = procesosQuery.data ?? []
  const procesosPagination = usePagination(procesos, { initialPageSize: 10 })
  const error = getErrorMessage(procesosQuery.error, '')

  return (
    <section>
      <div className="encabezado">
        <h1>Adjudicaciones</h1>
      </div>

      <div className="filtros">
        <Select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="pendientes">Pendientes</option>
          <option value="aprobadas">Aprobadas</option>
          <option value="todas">Todas</option>
        </Select>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {procesosQuery.isLoading || procesosQuery.isFetching ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : procesos.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Sin adjudicaciones" description="No hay adjudicaciones para el filtro seleccionado." />
      ) : (
        <>
        <table className="min-w-full divide-y divide-border text-sm">
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Titulo</th>
              <th>Proveedor adjudicado</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {procesosPagination.paginatedItems.map((p) => (
              <tr key={p.id}>
                <td>
                  <code>{p.codigo}</code>
                </td>
                <td>{p.titulo}</td>
                <td>{p.adjudicacion?.proveedor ?? '-'}</td>
                <td>
                  <Badge variant={claseEstado(p.estado)}>{etiquetaEstado(p.estado)}</Badge>
                </td>
                <td className="flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" onClick={() => navigate(`/adjudicaciones/${p.id}`)}>
                    {p.estado === ESTADO_PROCESO.ADJUDICADA ? 'Revisar' : 'Ver'}
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
