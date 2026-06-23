// Pantalla de Login.
//
// En producción el tenant se deduce del subdominio (tucuman.sicstmax.com).
// Acá, sin subdominios, el email alcanza para identificar al usuario y su tenant.

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'

export function LoginPage() {
  const { login, cargando } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destino = location.state?.from?.pathname ?? '/inicio'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function manejarSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await login({ email, password })
      navigate(destino, { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="login">
      <div className="login__panel">
        <Link className="login__volver" to="/" aria-label="Volver al portal publico">
          <ArrowLeft size={18} />
        </Link>

      <form className="login__caja" onSubmit={manejarSubmit}>
        <h1 className="login__titulo">SICST MAX</h1>
        <p className="login__subtitulo">Ingresá a tu cuenta</p>

        {error && <div className="alerta alerta--error">{error}</div>}

        <label className="campo">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="username"
          />
        </label>

        <label className="campo">
          <span>Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>

        <button className="btn btn--primario" type="submit" disabled={cargando}>
          {cargando ? 'Ingresando…' : 'Ingresar'}
        </button>

        <p className="login__registro">
          ¿Sos proveedor? <Link to="/registro-proveedor">Registrate acá</Link>
        </p>

        {/* Ayuda para probar el mock mientras no hay backend. */}
        <div className="login__ayuda">
          <p>Usuarios de prueba (cualquier contraseña):</p>
          <ul>
            <li>admin@sicstmax.com — Super Admin</li>
            <li>laura.gomez@tucuman.gob.ar — Admin tenant</li>
            <li>diego.ruiz@tucuman.gob.ar — Comprador</li>
            <li>roberto.diaz@tucuman.gob.ar — Aprobador</li>
            <li>carla.nunez@tucuman.gob.ar — Evaluador</li>
            <li>hugo.ramirez@tucuman.gob.ar — Auditor</li>
            <li>ventas@insumosnorte.com — Proveedor</li>
          </ul>
        </div>
      </form>
      </div>
    </div>
  )
}
