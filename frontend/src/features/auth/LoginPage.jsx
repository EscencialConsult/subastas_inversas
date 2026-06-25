// Pantalla de login.
//
// En produccion el tenant se deduce del subdominio. En esta etapa de pruebas,
// el email alcanza para identificar al usuario y su tenant.

import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'

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
      navigate(destino, { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  async function manejarMfa(e) {
    e.preventDefault()
    setError('')
    try {
      await verificarMfa({ mfaToken, code: mfaCode })
      navigate(destino, { replace: true })
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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm shadow-slate-200/40 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link to="/portal" className="flex items-center gap-3 no-underline">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-sky-900 text-sm font-black tracking-[0.08em] text-white">
              SC
            </span>
            <span className="flex flex-col">
              <span className="text-lg font-black tracking-[0.08em] text-sky-950">SICST</span>
              <span className="text-xs font-semibold text-slate-500">Acceso al sistema</span>
            </span>
          </Link>
          <Link
            to="/portal"
            className="rounded-md border border-sky-100 px-3 py-2 text-sm font-bold text-sky-800 transition hover:bg-sky-50"
          >
            Portal publico
          </Link>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-68px)] max-w-xl px-4 py-8 sm:px-8 lg:items-center lg:py-12">
        <form
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:p-7"
          onSubmit={mfaToken ? manejarMfa : manejarSubmit}
        >
          <div>
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Inicio de sesion
            </span>
            <h1 className="mt-2 text-2xl font-black text-slate-950">Ingresa a tu cuenta</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {mfaToken
                ? `Ingresa el codigo de tu app autenticadora${usuarioPendiente?.email ? ` para ${usuarioPendiente.email}` : ''}.`
                : 'Usa el email asignado para entrar al panel correspondiente.'}
            </p>
          </div>

          {error && (
            <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          {!mfaToken ? (
          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-slate-700">Email</span>
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="username"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-slate-700">Contrasena</span>
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                autoComplete="current-password"
              />
            </label>
          </div>
          ) : (
            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-bold text-slate-700">Codigo MFA</span>
                <input
                  className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </label>
              <button
                className="text-left text-sm font-black text-sky-800 hover:underline"
                type="button"
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
            className="mt-5 w-full rounded-md bg-sky-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-default disabled:opacity-60"
            type="submit"
            disabled={cargando}
          >
            {cargando ? 'Ingresando...' : mfaToken ? 'Verificar codigo' : 'Ingresar'}
          </button>

          {!mfaToken && <div className="mt-5 grid gap-2 text-center text-sm font-semibold">
            <p className="text-slate-600">
              Sos proveedor?{' '}
              <Link className="font-black text-sky-800 hover:underline" to="/registro-proveedor">
                Registrate aca
              </Link>
            </p>
            <Link className="font-black text-sky-800 hover:underline" to="/portal">
              Ver portal publico sin ingresar
            </Link>
          </div>}

          {!mfaToken && <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-800">Usuarios de prueba</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Selecciona uno para autocompletar el email y contraseña.
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                Demo
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {USUARIOS_DEMO.map((usuario) => (
                <button
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs transition hover:border-sky-200 hover:bg-sky-50"
                  key={usuario.email}
                  type="button"
                  onClick={() => usarDemo(usuario)}
                >
                  <span className="font-bold text-slate-700">{usuario.email}</span>
                  <span className="shrink-0 font-black text-sky-800">{usuario.rol}</span>
                </button>
              ))}
            </div>
          </div>}
        </form>
      </section>
    </main>
  )
}
