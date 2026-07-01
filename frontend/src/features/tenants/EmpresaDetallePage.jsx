// Detalle de una empresa (solo super-admin): datos + actividad + sus usuarios.
// Es una vista de supervisión de la plataforma, en solo lectura.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Clipboard, SearchX } from 'lucide-react'
import { Spinner } from '../../components/ui/Spinner.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { obtenerDetalleEmpresa } from '../../api/tenantsApi'
import { resetPassword } from '../../api/authApi'
import { etiquetaRol } from '../../domain/roles'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'

function generarPass() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let pass = ''
  for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length))
  return pass + 'Aa1!'
}

export function EmpresaDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [resetModal, setResetModal] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => {
      obtenerDetalleEmpresa({ id })
        .then(setData)
        .catch((err) => setError(err.message))
        .finally(() => setCargando(false))
    }, 0)
    return () => clearTimeout(t)
  }, [id])

  async function manejarResetPass(usuario) {
    try {
      const res = await resetPassword({ userId: usuario.id, newPassword: generarPass() })
      setResetModal({ usuario, nuevaPass: res.newPassword })
    } catch (err) {
      setError(err.message)
    }
  }

  if (cargando) return <div className="flex justify-center py-12"><Spinner /></div>
  if (!data) return <Alert variant="error">{error}</Alert>

  const { tenant, stats, usuarios } = data

  return (
    <section>
      <div className="encabezado">
        <h1>{tenant.nombre}</h1>
        <div className="tabla__acciones">
          <button className="btn btn--texto" onClick={() => navigate('/tenants')}>
            Volver
          </button>
          <button
            className="btn btn--primario"
            onClick={() => navigate(`/tenants/${tenant.id}`)}
          >
            Editar empresa
          </button>
        </div>
      </div>

      <div className="perfil__solo-lectura" style={{ maxWidth: 420 }}>
        <span>
          Subdominio: <code>{tenant.subdominio}</code>.sicst.gob.ar
        </span>
        <span>
          Estado:{' '}
          <Badge variant={tenant.activo ? 'success' : 'neutral'}>
            {tenant.activo ? 'Activa' : 'Inactiva'}
          </Badge>
        </span>
      </div>

      <div className="panel-cards">
        <div className="panel-card panel-card--info">
          <span className="panel-card__valor">{stats.usuarios}</span>
          <span className="panel-card__label">Usuarios</span>
        </div>
        <div className="panel-card panel-card--ok">
          <span className="panel-card__valor">{stats.activos}</span>
          <span className="panel-card__label">Activos</span>
        </div>
        <div className="panel-card panel-card--info">
          <span className="panel-card__valor">{stats.procesos}</span>
          <span className="panel-card__label">Procesos de compra</span>
        </div>
        <div className="panel-card panel-card--warn">
          <span className="panel-card__valor">{stats.subastas}</span>
          <span className="panel-card__label">Subastas</span>
        </div>
        <div className="panel-card panel-card--ok">
          <span className="panel-card__valor">
            {stats.ahorroProm === null ? '—' : `${stats.ahorroProm}%`}
          </span>
          <span className="panel-card__label">Ahorro promedio</span>
        </div>
      </div>

      <h2 className="form__titulo">Usuarios de la empresa</h2>
      {usuarios.length === 0 ? (
        <EmptyState icon={SearchX} title="Sin usuarios" description="Este tenant no tiene usuarios." />
      ) : (
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
            {usuarios.map((u) => (
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
                  <button className="btn btn--texto btn--texto-peligro" onClick={() => manejarResetPass(u)}>
                    Resetear pass
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {resetModal && (
        <div className="modal-overlay" onClick={() => setResetModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Contraseña restablecida</h2>
            </div>
            <div className="modal__body">
              <p>
                Se restableció la contraseña de <strong>{resetModal.usuario.nombre} {resetModal.usuario.apellido}</strong> ({resetModal.usuario.email}).
              </p>
              <Alert variant="info"><strong>Nueva contraseña temporal:</strong></Alert>
              <div className="contrasenia-temporal">
                <code>{resetModal.nuevaPass}</code>
                <button
                  type="button"
                  className="btn btn--icono"
                  title="Copiar contraseña"
                  onClick={() => navigator.clipboard.writeText(resetModal.nuevaPass)}
                >
                  <Clipboard size={16} />
                </button>
              </div>
              <p className="campo__ayuda">
                El usuario deberá cambiar esta contraseña al iniciar sesión. Copiala ahora antes de cerrar.
              </p>
            </div>
            <div className="modal__footer">
              <button className="btn btn--primario" onClick={() => setResetModal(null)}>
                Entendido, cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
