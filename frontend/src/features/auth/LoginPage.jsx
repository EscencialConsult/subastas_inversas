import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { ROLES } from '../../domain/roles.js'

const USUARIOS_DEMO = [
  { email: 'admin@sicst.com', rol: 'Super Admin', password: 'Admin123!' },
  { email: 'admin@prueba.com', rol: 'Admin tenant', password:'123456' },
  { email: 'usuario1@prueba.com', rol: 'Comprador', password:'123456' },
  { email: 'usuario2@prueba.com', rol: 'Evaluador', password:'123456' },
  { email: 'usuario3@prueba.com', rol: 'Autoridad', password:'123456' },
  { email: 'usuario4@prueba.com', rol: 'Auditor', password:'123456' },
  { email: 'ventas@kotler.com', rol: 'Proveedor', password:'123456' },
]

export function LoginPage() {
  const { login, verificarMfa, cargando } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destino = location.state?.from?.pathname ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaToken, setMfaToken] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [usuarioPendiente, setUsuarioPendiente] = useState(null)
  const [error, setError] = useState('')

  async function manejarSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const respuesta = await login({ email, password })
      if (respuesta?.requiereMfa) {
        setMfaToken(respuesta.mfaToken)
        setUsuarioPendiente(respuesta.usuarioPendiente)
        return
      }
      navigate(destinoSeguroPorRol(respuesta.usuario?.rol, destino), { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  async function manejarMfa(e) {
    e.preventDefault()
    setError('')
    try {
      const usuario = await verificarMfa({ mfaToken, code: mfaCode })
      navigate(destinoSeguroPorRol(usuario?.rol, destino), { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  function usarDemo(usuario) {
    setEmail(usuario.email)
    setPassword(usuario.password)
    setMfaToken('')
    setMfaCode('')
    setUsuarioPendiente(null)
  }

  return (
    <div className="public-page">
      <header className="page-header">
        <div className="contenedor page-header__inner">
          <Link to="/portal" className="page-header__brand">
            <span className="page-header__logo">SC</span>
            <span className="flex flex--col">
              <span className="page-header__title">SICST</span>
              <span className="page-header__subtitle">Acceso al sistema</span>
            </span>
          </Link>
          <nav className="page-header__nav">
            <Link to="/portal" className="btn btn--secundario">
              Portal publico
            </Link>
          </nav>
        </div>
      </header>

      <section className="public-form">
        <form
          className="public-form__card"
          onSubmit={mfaToken ? manejarMfa : manejarSubmit}
        >
          <div>
            <span className="public-form__tag">Inicio de sesion</span>
            <h1 className="public-form__title">Ingresa a tu cuenta</h1>
            <p className="public-form__desc">
              {mfaToken
                ? `Ingresa el codigo de tu app autenticadora${usuarioPendiente?.email ? ` para ${usuarioPendiente.email}` : ''}.`
                : 'Usa el email asignado para entrar al panel correspondiente.'}
            </p>
          </div>

          {error && (
            <div className="alerta alerta--error mt-16">
              {error}
            </div>
          )}

          {!mfaToken ? (
            <div className="public-form__grid">
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
                <span>Contrasena</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  autoComplete="current-password"
                />
              </label>
            </div>
          ) : (
            <div className="public-form__grid">
              <label className="campo">
                <span>Codigo MFA</span>
                <input
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </label>
              <button
                className="btn btn--texto"
                type="button"
                style={{ marginTop: 4, alignSelf: 'flex-start' }}
                onClick={() => {
                  setMfaToken('')
                  setMfaCode('')
                  setUsuarioPendiente(null)
                }}
              >
                Usar otra cuenta
              </button>
            </div>
          )}

          <button
            className="btn btn--primario btn--full mt-16"
            type="submit"
            disabled={cargando}
          >
            {cargando ? 'Ingresando...' : mfaToken ? 'Verificar codigo' : 'Ingresar'}
          </button>

          {!mfaToken && (
            <div className="text-center mt-16" style={{ fontSize: 13 }}>
              <p className="text-suave">
                Sos proveedor?{' '}
                <Link className="text-ok" style={{ fontWeight: 700 }} to="/registro-proveedor">
                  Registrate aca
                </Link>
              </p>
              <Link className="btn btn--texto mt-8" to="/portal">
                Ver portal publico sin ingresar
              </Link>
            </div>
          )}

          {!mfaToken && (
            <div className="demo-section">
              <div className="demo-section__header">
                <div>
                  <h2 className="demo-section__title">Usuarios de prueba</h2>
                  <p className="demo-section__help">
                    Selecciona uno para autocompletar el email y contraseña.
                  </p>
                </div>
                <span className="badge badge--off">Demo</span>
              </div>
              <div className="demo-section__list">
                {USUARIOS_DEMO.map((usuario) => (
                  <button
                    className="demo-section__user"
                    key={usuario.email}
                    type="button"
                    onClick={() => usarDemo(usuario)}
                  >
                    <span className="demo-section__user-email">{usuario.email}</span>
                    <span className="demo-section__user-rol">{usuario.rol}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </section>
    </div>
  )
}

function destinoSeguroPorRol(rol, destino) {
  if (rol === ROLES.EVALUADOR) return '/evaluacion'
  if (rol === ROLES.PROVEEDOR) return '/proveedor'
  if (!destino || destino === '/login') return '/'
  return destino
}
