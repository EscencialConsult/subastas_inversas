// Panel de inicio (dashboard). Es genérico: pide al backend (mock) el resumen
// que corresponde al rol del usuario y lo dibuja. Así, agregar/ajustar un panel
// es cambiar datos en dashboardApi, no esta pantalla.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { obtenerPanel } from '../../api/dashboardApi.js'

export function PanelPage() {
  const { usuario, tenant, rol } = useAuth()
  const [panel, setPanel] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      obtenerPanel({ rol, tenantId: usuario.tenantId })
        .then(setPanel)
        .catch((err) => setError(err.message))
        .finally(() => setCargando(false))
    }, 0)
    return () => clearTimeout(t)
  }, [rol, usuario.tenantId])

  if (cargando) return <p className="estado-cargando">Cargando panel…</p>
  if (!panel) return <div className="alerta alerta--error">{error}</div>

  return (
    <section>
      <div className="panel-saludo">
        <h1>Hola, {usuario.nombre}</h1>
        <p>
          {panel.titulo}
          {tenant && ` · ${tenant.nombre}`}
        </p>
      </div>

      {panel.nota && <div className="alerta alerta--info">{panel.nota}</div>}

      {panel.cards?.length > 0 && (
        <div className="panel-cards">
          {panel.cards.map((c) => (
            <div key={c.label} className={`panel-card ${c.clase ?? ''}`}>
              <span className="panel-card__valor">{c.valor}</span>
              <span className="panel-card__label">{c.label}</span>
            </div>
          ))}
        </div>
      )}

      {panel.listas?.map((lista) => (
        <div key={lista.titulo} className="panel-lista">
          <h2 className="form__titulo">{lista.titulo}</h2>
          {lista.items.length === 0 ? (
            <p className="panel-lista__vacio">Sin datos.</p>
          ) : (
            <ul className="panel-lista__items">
              {lista.items.map((it) => (
                <li key={it.texto}>
                  <span>{it.texto}</span>
                  <span className="panel-lista__valor">{it.valor}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {panel.acciones?.length > 0 && (
        <div className="panel-acciones">
          {panel.acciones.map((a) => (
            <Link key={a.to} to={a.to} className="btn btn--primario">
              {a.texto}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
