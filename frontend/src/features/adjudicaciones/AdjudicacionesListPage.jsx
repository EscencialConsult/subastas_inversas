// Listado para la Autoridad: permite revisar adjudicaciones pendientes y consultar las resueltas.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { listarProcesosParaAprobacion } from '../../api/comprasApi'
import { ESTADO_PROCESO, claseEstado, etiquetaEstado } from '../../domain/compras'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { Pagination, usePagination } from '../../components/ui/Pagination.jsx'
import { Select } from '../../components/ui/Select.jsx'
import { Spinner } from '../../components/ui/Spinner.jsx'

const FILTROS = {
  pendientes: ESTADO_PROCESO.ADJUDICADA,
  aprobadas: ESTADO_PROCESO.APROBADA,
  todas: '',
}

export function AdjudicacionesListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [procesos, setProcesos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('pendientes')
  const procesosPagination = usePagination(procesos, { initialPageSize: 10 })

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const lista = await listarProcesosParaAprobacion({
        tenantId,
        estado: FILTROS[filtro],
      })
      setProcesos(lista.filter((p) => p.estado === ESTADO_PROCESO.ADJUDICADA || p.estado === ESTADO_PROCESO.APROBADA))
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(cargar, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, filtro])

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

      {cargando ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : procesos.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Sin adjudicaciones" description="No hay adjudicaciones para el filtro seleccionado." />
      ) : (
        <>
        <table className="tabla">
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
                <td className="tabla__acciones">
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
