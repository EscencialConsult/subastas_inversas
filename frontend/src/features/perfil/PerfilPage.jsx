// "Mi perfil": cualquier usuario logueado edita sus datos y cambia su contraseña.
// Sirve para todos los roles internos (admin de tenant, comprador, etc.).

import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { actualizarPerfil, cambiarContrasena } from '../../api/usersApi.js'
import { etiquetaRol } from '../../domain/roles.js'

export function PerfilPage() {
  const { usuario, tenant, actualizarUsuarioSesion } = useAuth()

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>Mi perfil</h1>
      </div>

      <DatosPersonales
        usuario={usuario}
        tenant={tenant}
        onGuardado={actualizarUsuarioSesion}
      />
      <CambiarContrasena usuario={usuario} />
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
      onGuardado(actualizado) // refresca el header con el nombre nuevo
      setOk(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="form" onSubmit={manejarSubmit}>
      <h2 className="form__titulo">Datos personales</h2>

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

      {/* El rol y el tenant no se editan acá: los define el administrador. */}
      <div className="perfil__solo-lectura">
        <span>Rol: {etiquetaRol(usuario.rol)}</span>
        {tenant && <span>Organización: {tenant.nombre}</span>}
      </div>

      <div className="form__acciones">
        <button type="submit" className="btn btn--primario" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
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
    <form className="form" onSubmit={manejarSubmit}>
      <h2 className="form__titulo">Cambiar contraseña</h2>

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
    </form>
  )
}
