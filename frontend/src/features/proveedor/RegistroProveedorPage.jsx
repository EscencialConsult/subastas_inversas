// Auto-registro de proveedor. Pantalla publica, sin login.
// Tras registrarse, lo logueamos automaticamente y lo llevamos a su home.

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registrarProveedor } from '../../api/proveedoresApi.js'
import { useAuth } from '../../auth/AuthContext.jsx'

const VACIO = {
  razonSocial: '',
  cuit: '',
  email: '',
  provincia: '',
  localidad: '',
  password: '',
  repetir: '',
}

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
      await login({ email: datos.email, password: datos.password })
      navigate('/proveedor', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
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
              <span className="text-xs font-semibold text-slate-500">Registro proveedor</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/portal"
              className="rounded-md border border-sky-100 px-3 py-2 text-sm font-bold text-sky-800 transition hover:bg-sky-50"
            >
              Portal publico
            </Link>
            <Link
              to="/login"
              className="rounded-md bg-sky-700 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-sky-800"
            >
              Ingresar
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-68px)] max-w-xl px-4 py-8 sm:px-8 lg:items-center lg:py-12">
        <form
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:p-7"
          onSubmit={manejarSubmit}
        >
          <div>
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Crear cuenta
            </span>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Registro de proveedor</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Completa los datos principales de tu empresa para solicitar el alta.
            </p>
          </div>

          {error && (
            <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          <div className="mt-5 grid gap-4">
            <Campo
              label="Razon social"
              value={datos.razonSocial}
              onChange={(valor) => actualizar('razonSocial', valor)}
              placeholder="Insumos del Norte SRL"
            />
            <Campo
              label="CUIT"
              value={datos.cuit}
              onChange={(valor) => actualizar('cuit', valor)}
              placeholder="30-12345678-9"
            />
            <Campo
              label="Email"
              type="email"
              value={datos.email}
              onChange={(valor) => actualizar('email', valor)}
              placeholder="ventas@empresa.com"
              autoComplete="username"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                label="Provincia"
                value={datos.provincia}
                onChange={(valor) => actualizar('provincia', valor)}
                placeholder="Tucuman"
              />
              <Campo
                label="Localidad"
                value={datos.localidad}
                onChange={(valor) => actualizar('localidad', valor)}
                placeholder="San Miguel"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                label="Contrasena"
                type="password"
                value={datos.password}
                onChange={(valor) => actualizar('password', valor)}
                autoComplete="new-password"
                placeholder="Minimo 6 caracteres"
              />
              <Campo
                label="Repetir contrasena"
                type="password"
                value={datos.repetir}
                onChange={(valor) => actualizar('repetir', valor)}
                autoComplete="new-password"
                placeholder="Repetir contrasena"
              />
            </div>
          </div>

          <button
            className="mt-5 w-full rounded-md bg-sky-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-default disabled:opacity-60"
            type="submit"
            disabled={enviando}
          >
            {enviando ? 'Registrando...' : 'Crear cuenta de proveedor'}
          </button>

          <p className="mt-5 text-center text-sm font-semibold text-slate-600">
            Ya tenes cuenta?{' '}
            <Link className="font-black text-sky-800 hover:underline" to="/login">
              Ingresar
            </Link>
          </p>
        </form>
      </section>
    </main>
  )
}

function Campo({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  autoComplete,
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input
        className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
    </label>
  )
}
