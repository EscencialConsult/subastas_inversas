import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { actualizarPerfil, cambiarContrasena } from '../../api/usersApi.js'
import { activarMfa, desactivarMfa, prepararMfa } from '../../api/authApi.js'
import { etiquetaRol } from '../../domain/roles.js'
import { User, Shield, Lock, Key, Smartphone, CheckCircle, Save, RefreshCw, RotateCcw } from 'lucide-react'

export function PerfilPage() {
  const { usuario, tenant, actualizarUsuarioSesion } = useAuth()

  return (
    <section className="form-pagina" style={{ maxWidth: 640 }}>
      <div className="encabezado">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={24} /> Mi perfil
        </h1>
      </div>

      <DatosPersonales
        usuario={usuario}
        tenant={tenant}
        onGuardado={actualizarUsuarioSesion}
      />
      <CambiarContrasena usuario={usuario} />
      <Mfa usuario={usuario} onGuardado={actualizarUsuarioSesion} />
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
    <form className="form" onSubmit={manejarSubmit}>
      <h2 className="form__titulo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <User size={20} /> Datos personales
      </h2>

      {error && <div className="alerta alerta--error">{error}</div>}
      {ok && <div className="alerta alerta--ok">Tus datos se guardaron.</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <label className="campo">
          <span>Nombre</span>
          <input value={datos.nombre} onChange={(e) => actualizar('nombre', e.target.value)} />
        </label>

        <label className="campo">
          <span>Apellido</span>
          <input value={datos.apellido} onChange={(e) => actualizar('apellido', e.target.value)} />
        </label>

        <label className="campo" style={{ gridColumn: '1 / -1' }}>
          <span>Email</span>
          <input
            type="email"
            value={datos.email}
            onChange={(e) => actualizar('email', e.target.value)}
          />
        </label>
      </div>

      <div className="perfil__solo-lectura" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <span><strong>Rol:</strong> {etiquetaRol(usuario.rol)}</span>
        {tenant && <span><strong>Organización:</strong> {tenant.nombre}</span>}
      </div>

      <div className="form__acciones">
        <button type="submit" className="btn btn--primario" disabled={guardando} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {guardando ? 'Guardando…' : <><Save size={16} /> Guardar cambios</>}
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
      <h2 className="form__titulo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Lock size={20} /> Cambiar contraseña
      </h2>

      {error && <div className="alerta alerta--error">{error}</div>}
      {ok && <div className="alerta alerta--ok">Contraseña actualizada.</div>}

      <label className="campo">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Key size={14} /> Contraseña actual
        </span>
        <input
          type="password"
          value={campos.actual}
          onChange={(e) => actualizar('actual', e.target.value)}
          autoComplete="current-password"
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <label className="campo">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lock size={14} /> Nueva contraseña
          </span>
          <input
            type="password"
            value={campos.nueva}
            onChange={(e) => actualizar('nueva', e.target.value)}
            autoComplete="new-password"
          />
        </label>

        <label className="campo">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Repetir nueva
          </span>
          <input
            type="password"
            value={campos.repetir}
            onChange={(e) => actualizar('repetir', e.target.value)}
            autoComplete="new-password"
          />
        </label>
      </div>

      <div className="form__acciones">
        <button type="submit" className="btn btn--primario" disabled={guardando} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {guardando ? 'Guardando…' : <><RefreshCw size={16} /> Cambiar contraseña</>}
        </button>
      </div>
    </form>
  )
}

function Mfa({ usuario, onGuardado }) {
  const [setup, setSetup] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  async function iniciarSetup() {
    setCargando(true)
    setError('')
    setOk('')
    try {
      const data = await prepararMfa()
      setSetup(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  async function confirmar() {
    setCargando(true)
    setError('')
    setOk('')
    try {
      await activarMfa({ code: codigo })
      onGuardado({ ...usuario, mfaActivo: true })
      setSetup(null)
      setCodigo('')
      setOk('MFA activado.')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  async function desactivar() {
    setCargando(true)
    setError('')
    setOk('')
    try {
      await desactivarMfa({ code: codigo })
      onGuardado({ ...usuario, mfaActivo: false })
      setCodigo('')
      setOk('MFA desactivado.')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  const estadoBadge = usuario.mfaActivo ? 'badge badge--ok' : 'badge badge--off'

  return (
    <div className="form">
      <h2 className="form__titulo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Shield size={20} /> Autenticación multifactor
      </h2>

      {error && <div className="alerta alerta--error">{error}</div>}
      {ok && <div className="alerta alerta--ok">{ok}</div>}

      <p className="campo__ayuda" style={{ marginBottom: 12 }}>
        Estado: <span className={estadoBadge}>{usuario.mfaActivo ? 'Activo' : 'Inactivo'}</span>
      </p>

      {!usuario.mfaActivo && !setup && (
        <div className="form__acciones">
          <button className="btn btn--primario" type="button" onClick={iniciarSetup} disabled={cargando} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Smartphone size={16} /> Activar MFA
          </button>
        </div>
      )}

      {!usuario.mfaActivo && setup && (
        <>
          <div className="perfil__solo-lectura">
            <span><strong>Secret:</strong> <code>{setup.secret}</code></span>
            <span><strong>URI:</strong> <code>{setup.otpAuthUri}</code></span>
          </div>
          <label className="campo">
            <span>Código de verificación</span>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
            />
          </label>
          <div className="form__acciones">
            <button className="btn btn--texto" type="button" onClick={() => setSetup(null)}>
              Cancelar
            </button>
            <button className="btn btn--primario" type="button" onClick={confirmar} disabled={cargando} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={16} /> Confirmar MFA
            </button>
          </div>
        </>
      )}

      {usuario.mfaActivo && (
        <>
          <label className="campo">
            <span>Código actual</span>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
            />
          </label>
          <div className="form__acciones">
            <button className="btn btn--peligro" type="button" onClick={desactivar} disabled={cargando} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RotateCcw size={16} /> Desactivar MFA
            </button>
          </div>
        </>
      )}
    </div>
  )
}
