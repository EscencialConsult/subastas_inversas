// Layout del portal ciudadano (zona publica, sin login).

import { Link, Outlet } from 'react-router-dom'

export function PortalLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm shadow-slate-200/40 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/portal" className="flex items-center gap-3 no-underline">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-sky-900 text-sm font-black tracking-[0.08em] text-white">
              SC
            </span>
            <span className="flex flex-col">
              <span className="text-lg font-black tracking-[0.08em] text-sky-950">SICST</span>
              <span className="text-xs font-semibold text-slate-500">Portal de transparencia</span>
            </span>
          </Link>
          <nav className="flex flex-col gap-2 sm:flex-row sm:items-center" aria-label="Accesos publicos">
            <Link
              to="/registro-proveedor"
              className="rounded-md border border-sky-100 px-3 py-2 text-center text-sm font-bold text-sky-800 transition hover:bg-sky-50"
            >
              Registro proveedor
            </Link>
            <Link
              to="/login"
              className="rounded-md bg-sky-700 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
            >
              Ingresar
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}
