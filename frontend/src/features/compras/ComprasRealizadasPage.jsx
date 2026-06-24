// Compras realizadas (legajos): archivo de las compras ya adjudicadas/aprobadas
// del comprador, con el proveedor y el monto. Cada fila abre el legajo completo.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { listarComprasRealizadas } from '../../api/comprasApi.js'
import { etiquetaEstado, claseEstado } from '../../domain/compras.js'

export function ComprasRealizadasPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [compras, setCompras] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const lista = await listarComprasRealizadas({ tenantId, busqueda })
      setCompras(lista)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(cargar, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, busqueda])

  return (
    <section>
      <div className="encabezado">
        <h1>Compras realizadas</h1>
      </div>

      <div className="filtros">
        <input
          className="filtros__busqueda"
          placeholder="Buscar por código, título o proveedor…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      {cargando ? (
        <p className="estado-cargando">Cargando…</p>
      ) : compras.length === 0 ? (
        <div className="estado-vacio">
          <p>Todavía no hay compras realizadas.</p>
        </div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Código</th>
              <th>Título</th>
              <th>Proveedor</th>
              <th>Monto</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {compras.map((c) => (
              <tr key={c.id}>
                <td>
                  <code>{c.codigo}</code>
                </td>
                <td>{c.titulo}</td>
                <td>{c.proveedor}</td>
                <td>{formatearPesos(c.monto)}</td>
                <td>{c.fecha}</td>
                <td>
                  <span className={`badge ${claseEstado(c.estado)}`}>
                    {etiquetaEstado(c.estado)}
                  </span>
                </td>
                <td className="tabla__acciones">
                  <button
                    className="btn btn--texto"
                    onClick={() => navigate(`/compras/${c.id}`)}
                  >
                    Ver legajo
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
