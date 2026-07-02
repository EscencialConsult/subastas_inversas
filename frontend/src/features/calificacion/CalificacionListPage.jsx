import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { listarProcesosParaCalificacion } from '../../shared/api/comprasApi'
import { etiquetaEstado, claseEstado } from '../../domain/compras'
import { Badge } from '../../shared/ui/Badge'
import { Alert } from '../../shared/ui/Alert'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Pagination, usePagination } from '../../shared/ui/Pagination.jsx'
import { Spinner } from '../../shared/ui/Spinner.jsx'

export function CalificacionListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [procesos, setProcesos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const procesosPagination = usePagination(procesos, { initialPageSize: 10 })

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const lista = await listarProcesosParaCalificacion({ tenantId, busqueda })
      setProcesos(lista)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(cargar, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, busqueda])

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>Calificación de Proveedores</h1>
        <p className="form__seccion-ayuda">
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

      {cargando ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : procesos.length === 0 ? (
        <EmptyState icon={SearchX} title="Sin procesos" description="No hay procesos con proveedores pendientes de calificación." />
      ) : (
        <>
        <table className="tabla">
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
