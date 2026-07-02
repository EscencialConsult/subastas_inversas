// Listado de tenants (empresas/municipios cliente). Solo super-admin.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarTenants, cambiarEstadoTenant } from '../../shared/api/tenantsApi'
import { Building2 } from 'lucide-react'
import { Alert } from '../../shared/ui/Alert'
import { Spinner } from '../../shared/ui/Spinner.jsx'
import { EmptyState } from '../../shared/ui/EmptyState.jsx'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input.jsx'
import { Pagination, usePagination } from '../../shared/ui/Pagination.jsx'
import { Select } from '../../shared/ui/Select.jsx'

export function TenantsListPage() {
  const navigate = useNavigate()

  const [tenants, setTenants] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const tenantsPagination = usePagination(tenants, { initialPageSize: 10 })

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const lista = await listarTenants({ busqueda, estado })
      setTenants(lista)
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
  }, [busqueda, estado])

  async function alternarEstado(tenant) {
    try {
      await cambiarEstadoTenant({ id: tenant.id, activo: !tenant.activo })
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section>
      <div className="encabezado">
        <h1>Tenants</h1>
        <Button onClick={() => navigate('/tenants/nuevo')}>
          + Nuevo tenant
        </Button>
      </div>

      <div className="filtros">
        <Input
          className="filtros__busqueda"
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

      {error && <Alert variant="error">{error}</Alert>}

      {cargando ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : tenants.length === 0 ? (
        <EmptyState icon={Building2} title="Sin empresas" description="No hay tenants que coincidan con el filtro." />
      ) : (
        <>
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Subdominio</th>
                <th>Usuarios</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tenantsPagination.paginatedItems.map((t) => (
                <tr key={t.id}>
                  <td>{t.nombre}</td>
                  <td>
                    <code>{t.subdominio}</code>
                  </td>
                  <td>{t.cantidadUsuarios}</td>
                  <td>
                    <Badge variant={t.activo ? 'success' : 'neutral'}>
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="tabla__acciones">
                    <Button variant="ghost" onClick={() => navigate(`/tenants/${t.id}/detalle`)}>
                      Detalle
                    </Button>
                    <Button variant="ghost" onClick={() => navigate(`/tenants/${t.id}`)}>
                      Editar
                    </Button>
                    <Button variant="ghost" onClick={() => alternarEstado(t)}>
                      {t.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={tenantsPagination.page}
            pageSize={tenantsPagination.pageSize}
            totalItems={tenantsPagination.totalItems}
            totalPages={tenantsPagination.totalPages}
            onPageChange={tenantsPagination.setPage}
            onPageSizeChange={tenantsPagination.setPageSize}
          />
        </>
      )}
    </section>
  )
}
