// Alta y edición de usuario (la misma pantalla sirve para ambos).
//
// Si la ruta trae :id -> edición; si no -> alta.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import {
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
} from '../../api/usersApi.js'
import { ROLE_INFO, ROLES_ASIGNABLES_POR_TENANT } from '../../domain/roles.js'

const VACIO = { nombre: '', apellido: '', email: '', rol: '', activo: true }

export function UsuarioFormPage() {
  const { id } = useParams()
  const esEdicion = Boolean(id)
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [datos, setDatos] = useState(VACIO)
  const [cargando, setCargando] = useState(esEdicion)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!esEdicion) return
    obtenerUsuario({ tenantId, id })
      .then((u) =>
        setDatos({
          nombre: u.nombre,
          apellido: u.apellido,
          email: u.email,
          rol: u.rol,
          activo: u.activo,
        }),
      )
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [esEdicion, tenantId, id])

  function actualizarCampo(campo, valor) {
    setDatos((prev) => ({ ...prev, [campo]: valor }))
  }

  async function manejarSubmit(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      if (esEdicion) {
        await actualizarUsuario({ tenantId, id, datos })
      } else {
        await crearUsuario({ tenantId, datos })
      }
      navigate('/usuarios')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <p className="estado-cargando">Cargando…</p>

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>{esEdicion ? 'Editar usuario' : 'Nuevo usuario'}</h1>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      <form className="form" onSubmit={manejarSubmit}>
        <label className="campo">
          <span>Nombre</span>
          <input
            value={datos.nombre}
            onChange={(e) => actualizarCampo('nombre', e.target.value)}
          />
        </label>

        <label className="campo">
          <span>Apellido</span>
          <input
            value={datos.apellido}
            onChange={(e) => actualizarCampo('apellido', e.target.value)}
          />
        </label>

        <label className="campo">
          <span>Email</span>
          <input
            type="email"
            value={datos.email}
            onChange={(e) => actualizarCampo('email', e.target.value)}
          />
        </label>

        <label className="campo">
          <span>Rol</span>
          <select
            value={datos.rol}
            onChange={(e) => actualizarCampo('rol', e.target.value)}
          >
            <option value="">Elegí un rol…</option>
            {ROLES_ASIGNABLES_POR_TENANT.map((clave) => (
              <option key={clave} value={clave}>
                {ROLE_INFO[clave].label}
              </option>
            ))}
          </select>
          {datos.rol && (
            <small className="campo__ayuda">{ROLE_INFO[datos.rol].descripcion}</small>
          )}
        </label>

        <label className="campo campo--checkbox">
          <input
            type="checkbox"
            checked={datos.activo}
            onChange={(e) => actualizarCampo('activo', e.target.checked)}
          />
          <span>Usuario activo</span>
        </label>

        <div className="form__acciones">
          <button
            type="button"
            className="btn btn--texto"
            onClick={() => navigate('/usuarios')}
          >
            Cancelar
          </button>
          <button type="submit" className="btn btn--primario" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </section>
  )
}
