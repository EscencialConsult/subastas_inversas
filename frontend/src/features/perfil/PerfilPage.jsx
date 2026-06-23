import { useState } from 'react'
import { UserRound, Lock, BadgeCheck, Building2 } from 'lucide-react'
import { useAuth } from '../../auth/useAuth.js'
import { actualizarPerfil, cambiarContrasena } from '../../api/usersApi.js'
import { etiquetaRol } from '../../domain/roles.js'
import { iniciales } from '../../utils/iniciales.js'

export function PerfilPage() {
  const { usuario, tenant, actualizarUsuarioSesion } = useAuth()

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>Mi perfil</h1>
      </div>

      <div className="perfil__resumen">
        <div className="perfil__avatar">
          {iniciales(usuario.nombre, usuario.apellido)}
        </div>
        <div className="perfil__resumen-info">
          <span className="perfil__resumen-nombre">
            {usuario.nombre} {usuario.apellido}
          </span>
          <span className="perfil__resumen-detalle">
            <BadgeCheck size={15} />
            {etiquetaRol(usuario.rol)}
            {tenant && (
              <>
                <span aria-hidden="true">·</span>
                <Building2 size={15} />
                {tenant.nombre}
              </>
            )}
          </span>
        </div>
      </div>

      <div className="perfil__grid">
        <DatosPersonales
          usuario={usuario}
          tenant={tenant}
          onGuardado={actualizarUsuarioSesion}
        />
        <CambiarContrasena usuario={usuario} />
      </div>
    </section>
  )
}

function DatosPersonales({ usuario, tenant, onGuardado }) {
  const [datos, setDatos] = useState({
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  function actualizar(campo, valor) {
    setDatos((prev) => ({ ...prev, [campo]: valor }))
    setOk(false)
  }

  async function manejarSubmit(e) {
    e.preventDefault()
    setError('')
    setOk(false)
    setGuardando(true)
    try {
      const actualizado = await actualizarPerfil({ id: usuario.id, datos })
      onGuardado(actualizado)
      setOk(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="perfil__seccion" onSubmit={manejarSubmit}>
      <div className="perfil__seccion-header">
        <div className="perfil__seccion-icon">
          <UserRound size={18} />
        </div>
        <div>
          <h2>Datos personales</h2>
          <p>Actualizá tu información de contacto</p>
        </div>
      </div>

      <div className="perfil__cuerpo">
        {error && <div className="alerta alerta--error">{error}</div>}
        {ok && <div className="alerta alerta--ok">Tus datos se guardaron.</div>}

        <label className="campo">
          <span>Nombre</span>
          <input value={datos.nombre} onChange={(e) => actualizar('nombre', e.target.value)} />
        </label>

        <label className="campo">
          <span>Apellido</span>
          <input
            value={datos.apellido}
            onChange={(e) => actualizar('apellido', e.target.value)}
          />
        </label>

        <label className="campo">
          <span>Email</span>
          <input
            type="email"
            value={datos.email}
            onChange={(e) => actualizar('email', e.target.value)}
          />
        </label>

        <div className="perfil__solo-lectura">
          <span className="flex items-center gap-1.5">
            <BadgeCheck size={15} className="shrink-0" />
            {etiquetaRol(usuario.rol)}
          </span>
          {tenant && (
            <span className="flex items-center gap-1.5">
              <Building2 size={15} className="shrink-0" />
              {tenant.nombre}
            </span>
          )}
        </div>

        <div className="form__acciones">
          <button type="submit" className="btn btn--primario" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </form>
  )
}

function CambiarContrasena({ usuario }) {
  const [campos, setCampos] = useState({ actual: '', nueva: '', repetir: '' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  function actualizar(campo, valor) {
    setCampos((prev) => ({ ...prev, [campo]: valor }))
    setOk(false)
  }

  async function manejarSubmit(e) {
    e.preventDefault()
    setError('')
    setOk(false)
    setGuardando(true)
    try {
      await cambiarContrasena({ id: usuario.id, ...campos })
      setOk(true)
      setCampos({ actual: '', nueva: '', repetir: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="perfil__seccion" onSubmit={manejarSubmit}>
      <div className="perfil__seccion-header">
        <div className="perfil__seccion-icon">
          <Lock size={18} />
        </div>
        <div>
          <h2>Cambiar contraseña</h2>
          <p>Actualizá tu contraseña de acceso</p>
        </div>
      </div>

      <div className="perfil__cuerpo">
        {error && <div className="alerta alerta--error">{error}</div>}
        {ok && <div className="alerta alerta--ok">Contraseña actualizada.</div>}

        <label className="campo">
          <span>Contraseña actual</span>
          <input
            type="password"
            value={campos.actual}
            onChange={(e) => actualizar('actual', e.target.value)}
            autoComplete="current-password"
          />
        </label>

        <label className="campo">
          <span>Nueva contraseña</span>
          <input
            type="password"
            value={campos.nueva}
            onChange={(e) => actualizar('nueva', e.target.value)}
            autoComplete="new-password"
          />
        </label>

        <label className="campo">
          <span>Repetir nueva contraseña</span>
          <input
            type="password"
            value={campos.repetir}
            onChange={(e) => actualizar('repetir', e.target.value)}
            autoComplete="new-password"
          />
        </label>

        <div className="form__acciones">
          <button type="submit" className="btn btn--primario" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </div>
      </div>
    </form>
  )
}
