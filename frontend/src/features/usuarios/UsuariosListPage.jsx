// Listado de usuarios del tenant, con buscador y filtros.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Clipboard, SearchX } from 'lucide-react'
import { listarUsuarios, cambiarEstadoUsuario } from '../../shared/api/usersApi'
import { resetPassword } from '../../shared/api/authApi'
import { ROLE_INFO, etiquetaRol } from '../../domain/roles'
import { Button } from '../../shared/ui/Button'
import { Modal } from '../../shared/ui/Modal'
import { Spinner } from '../../shared/ui/Spinner.jsx'
import { EmptyState } from '../../shared/ui/EmptyState.jsx'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Input } from '../../shared/ui/Input.jsx'
import { Pagination, usePagination } from '../../shared/ui/Pagination.jsx'
import { Select } from '../../shared/ui/Select.jsx'

export function UsuariosListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [resetModal, setResetModal] = useState(null) // { usuario, nuevaPass }

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [rol, setRol] = useState('')
  const [estado, setEstado] = useState('') // '', 'activos', 'inactivos'
  const usuariosPagination = usePagination(usuarios, { initialPageSize: 10 })

  async function cargar() {
    if (!tenantId) return
    setCargando(true)
    setError('')
    try {
      const soloActivos = estado === '' ? null : estado === 'activos'
      const lista = await listarUsuarios({ tenantId, busqueda, rol, soloActivos })
      setUsuarios(lista)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  // Recargamos cuando cambian los filtros (debounce simple para la búsqueda).
  useEffect(() => {
    const t = setTimeout(cargar, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, busqueda, rol, estado])

  async function alternarEstado(usuario) {
    try {
      await cambiarEstadoUsuario({ tenantId, id: usuario.id, activo: !usuario.activo })
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  function generarPass() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let pass = ''
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return pass + 'Aa1!'
  }

  async function manejarResetPass(usuario) {
    const nuevaPass = generarPass()
    try {
      const res = await resetPassword({ userId: usuario.id, newPassword: nuevaPass })
      setResetModal({ usuario, nuevaPass: res.newPassword })
    } catch (err) {
      setError(err.message)
    }
  }

  if (!tenantId) {
    return (
      <section>
        <div className="encabezado">
          <h1>Usuarios</h1>
        </div>
        <Alert variant="info">Seleccioná una empresa desde{' '}
          <Button variant="ghost" onClick={() => navigate('/tenants')}>
            Tenants
          </Button>{' '}
          y luego ingresá a su detalle para administrar sus usuarios.</Alert>
      </section>
    )
  }

  return (
    <section>
      <div className="encabezado">
        <h1>Usuarios</h1>
          <Button onClick={() => navigate('/usuarios/nuevo')}>
            + Nuevo usuario
          </Button>
      </div>

      <div className="filtros">
        <Input
          className="filtros__busqueda"
          placeholder="Buscar por nombre o email…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <Select value={rol} onChange={(e) => setRol(e.target.value)}>
          <option value="">Todos los roles</option>
          {Object.entries(ROLE_INFO).map(([clave, info]) => (
            <option key={clave} value={clave}>
              {info.label}
            </option>
          ))}
        </Select>
        <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </Select>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {cargando ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : usuarios.length === 0 ? (
        <EmptyState icon={SearchX} title="Sin resultados" description="No hay usuarios que coincidan con el filtro." />
      ) : (
        <>
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuariosPagination.paginatedItems.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.nombre} {u.apellido}
                  </td>
                  <td>{u.email}</td>
                  <td>{etiquetaRol(u.rol)}</td>
                  <td>
                    <Badge variant={u.activo ? 'success' : 'neutral'}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="tabla__acciones">
                    <Button variant="ghost" onClick={() => navigate(`/usuarios/${u.id}`)}>
                      Editar
                    </Button>
                    <Button variant="ghost" onClick={() => alternarEstado(u)}>
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button variant="ghost" className="text-error hover:bg-red-50 hover:text-error" onClick={() => manejarResetPass(u)}>
                      Resetear pass
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={usuariosPagination.page}
            pageSize={usuariosPagination.pageSize}
            totalItems={usuariosPagination.totalItems}
            totalPages={usuariosPagination.totalPages}
            onPageChange={usuariosPagination.setPage}
            onPageSizeChange={usuariosPagination.setPageSize}
          />
        </>
      )}

      <Modal
        open={!!resetModal}
        onClose={() => setResetModal(null)}
        title="Contraseña restablecida"
        footer={<Button onClick={() => { setResetModal(null); cargar() }}>Entendido, cerrar</Button>}
      >
        <p>
          Se restableció la contraseña de <strong>{resetModal?.usuario.nombre} {resetModal?.usuario.apellido}</strong> ({resetModal?.usuario.email}).
        </p>
        <div className="bg-background border border-border rounded-md p-3 my-3 flex items-center gap-2">
          <code className="flex-1 text-lg font-bold tracking-wide">{resetModal?.nuevaPass}</code>
          <button
            type="button"
            className="btn btn--icono"
            title="Copiar contraseña"
            onClick={() => navigator.clipboard.writeText(resetModal?.nuevaPass)}
          >
            <Clipboard size={16} />
          </button>
        </div>
        <p className="text-xs text-text-muted">
          El usuario deberá cambiar esta contraseña al iniciar sesión. Copiala ahora antes de cerrar.
        </p>
      </Modal>
    </section>
  )
}
