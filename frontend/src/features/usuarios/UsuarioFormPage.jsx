// Alta y edicion de usuario. La misma pantalla sirve para crear y editar.

import { useEffect, useState } from 'react'
import { Save, ShieldCheck, UserRound, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import {
  actualizarUsuario,
  crearUsuario,
  obtenerUsuario,
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

  if (cargando) return <p className="estado-cargando">Cargando...</p>

  const rolSeleccionado = datos.rol ? ROLE_INFO[datos.rol] : null

  return (
    <section className="form-pagina usuario-form-page">
      <div className="encabezado">
        <div>
          <span className="pagina-eyebrow">Gestion de accesos</span>
          <h1>{esEdicion ? 'Editar usuario' : 'Nuevo usuario'}</h1>
          <p className="pagina-descripcion">
            Carga los datos de identidad, asigna un rol operativo y define si el acceso queda activo.
          </p>
        </div>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      <form className="form usuario-form" onSubmit={manejarSubmit}>
        <header className="usuario-form__header">
          <span className="usuario-form__icon">
            <UserRound size={22} />
          </span>
          <div>
            <h2>Datos del usuario</h2>
            <p>Esta informacion identifica al usuario dentro de la organizacion.</p>
          </div>
        </header>

        <div className="usuario-form__grid">
          <label className="campo">
            <span>Nombre</span>
            <input
              value={datos.nombre}
              onChange={(e) => actualizarCampo('nombre', e.target.value)}
              placeholder="Nombre"
            />
          </label>

          <label className="campo">
            <span>Apellido</span>
            <input
              value={datos.apellido}
              onChange={(e) => actualizarCampo('apellido', e.target.value)}
              placeholder="Apellido"
            />
          </label>

          <label className="campo usuario-form__full">
            <span>Email</span>
            <input
              type="email"
              value={datos.email}
              onChange={(e) => actualizarCampo('email', e.target.value)}
              placeholder="usuario@organizacion.gob.ar"
              autoComplete="email"
            />
          </label>
        </div>

        <section className="usuario-form__section">
          <div className="usuario-form__section-title">
            <ShieldCheck size={18} />
            <div>
              <h3>Permisos y estado</h3>
              <p>El rol determina que modulos puede operar este usuario.</p>
            </div>
          </div>

          <div className="usuario-form__grid usuario-form__grid--permisos">
            <label className="campo">
              <span>Rol</span>
              <select
                value={datos.rol}
                onChange={(e) => actualizarCampo('rol', e.target.value)}
              >
                <option value="">Elegi un rol...</option>
                {ROLES_ASIGNABLES_POR_TENANT.map((clave) => (
                  <option key={clave} value={clave}>
                    {ROLE_INFO[clave].label}
                  </option>
                ))}
              </select>
              {rolSeleccionado && (
                <small className="campo__ayuda">{rolSeleccionado.descripcion}</small>
              )}
            </label>

            <label className="usuario-status">
              <input
                type="checkbox"
                checked={datos.activo}
                onChange={(e) => actualizarCampo('activo', e.target.checked)}
              />
              <span className="usuario-status__control" aria-hidden="true" />
              <span>
                <strong>Usuario activo</strong>
                <small>Permite iniciar sesion y operar con los permisos asignados.</small>
              </span>
            </label>
          </div>
        </section>

        <div className="form__acciones usuario-form__acciones">
          <button
            type="button"
            className="btn btn--texto"
            onClick={() => navigate('/usuarios')}
          >
            <X size={17} />
            Cancelar
          </button>
          <button type="submit" className="btn btn--primario" disabled={guardando}>
            <Save size={17} />
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </section>
  )
}
