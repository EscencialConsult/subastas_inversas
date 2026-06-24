// Auto-registro de proveedor. Pantalla PÚBLICA (sin login), como el login.
// Tras registrarse, lo logueamos automáticamente y lo llevamos a su home.

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registrarProveedor } from '../../api/proveedoresApi.js'
import { useAuth } from '../../auth/AuthContext.jsx'

const VACIO = { razonSocial: '', cuit: '', email: '', password: '', repetir: '' }

export function RegistroProveedorPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [datos, setDatos] = useState(VACIO)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  function actualizar(campo, valor) {
    setDatos((prev) => ({ ...prev, [campo]: valor }))
  }

  async function manejarSubmit(e) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await registrarProveedor({ datos })
      // Lo dejamos adentro directamente (mock acepta cualquier contraseña).
      await login({ email: datos.email, password: datos.password })
      navigate('/proveedor', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="login">
      <form className="login__caja" onSubmit={manejarSubmit}>
        <h1 className="login__titulo">SICST</h1>
        <p className="login__subtitulo">Registro de proveedor</p>

        {error && <div className="alerta alerta--error">{error}</div>}

        <label className="campo">
          <span>Razón social</span>
          <input
            value={datos.razonSocial}
            onChange={(e) => actualizar('razonSocial', e.target.value)}
            placeholder="Insumos del Norte SRL"
          />
        </label>

        <label className="campo">
          <span>CUIT</span>
          <input
            value={datos.cuit}
            onChange={(e) => actualizar('cuit', e.target.value)}
            placeholder="30-12345678-9"
          />
        </label>

        <label className="campo">
          <span>Email</span>
          <input
            type="email"
            value={datos.email}
            onChange={(e) => actualizar('email', e.target.value)}
            placeholder="ventas@empresa.com"
            autoComplete="username"
          />
        </label>

        <label className="campo">
          <span>Contraseña</span>
          <input
            type="password"
            value={datos.password}
            onChange={(e) => actualizar('password', e.target.value)}
            autoComplete="new-password"
          />
        </label>

        <label className="campo">
          <span>Repetir contraseña</span>
          <input
            type="password"
            value={datos.repetir}
            onChange={(e) => actualizar('repetir', e.target.value)}
            autoComplete="new-password"
          />
        </label>

        <button className="btn btn--primario" type="submit" disabled={enviando}>
          {enviando ? 'Registrando…' : 'Crear cuenta de proveedor'}
        </button>

        <div className="login__ayuda">
          <p>
            ¿Ya tenés cuenta? <Link to="/login">Ingresar</Link>
          </p>
        </div>
      </form>
    </div>
  )
}
