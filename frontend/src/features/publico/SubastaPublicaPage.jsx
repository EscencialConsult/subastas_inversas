// Subasta pública (ciudadano): vista ANÓNIMA en vivo.
// Muestra el precio actual, el tiempo y los movimientos de precio, SIN revelar
// quién oferta. Es la transparencia que pide el documento.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { obtenerSubastaPublica } from '../../api/publicoApi.js'

export function SubastaPublicaPage() {
  const { procesoId } = useParams()
  const navigate = useNavigate()

  const [subasta, setSubasta] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [restante, setRestante] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => {
      obtenerSubastaPublica({ procesoId })
        .then(setSubasta)
        .catch((err) => setError(err.message))
        .finally(() => setCargando(false))
    }, 0)
    return () => clearTimeout(t)
  }, [procesoId])

  // Cuenta regresiva (maqueta, reloj del navegador).
  useEffect(() => {
    if (!subasta) return
    const cierre =
      new Date(subasta.inicioISO).getTime() + subasta.duracionMin * 60000
    const tick = () => setRestante(cierre - Date.now())
    tick()
    const intervalo = setInterval(tick, 1000)
    return () => clearInterval(intervalo)
  }, [subasta])

  if (cargando) return <p className="estado-cargando">Cargando subasta…</p>
  if (!subasta) return <div className="alerta alerta--error">{error}</div>

  const cerrada = restante !== null && restante <= 0

  return (
    <section>
      <div className="encabezado">
        <h1>
          Subasta · <code>{subasta.codigo}</code>
        </h1>
        <button className="btn btn--texto" onClick={() => navigate('/portal')}>
          Volver
        </button>
      </div>
      <p className="proceso__descripcion">
        {subasta.titulo} — {subasta.empresa}
      </p>

      <div className="alerta alerta--info">
        Vista pública anónima: se muestran los precios y el tiempo, no la
        identidad de los oferentes (se revela al cierre).
      </div>

      <div className="subasta__panel">
        <div className="subasta__card">
          <span className="subasta__label">Precio actual</span>
          <span className="subasta__valor subasta__valor--destacado">
            {formatearPesos(subasta.precioActual)}
          </span>
        </div>
        <div className="subasta__card">
          <span className="subasta__label">Presupuesto base</span>
          <span className="subasta__valor">{formatearPesos(subasta.precioBase)}</span>
        </div>
        <div className="subasta__card">
          <span className="subasta__label">Tiempo restante</span>
          <span className="subasta__valor">
            {cerrada ? 'Finalizada' : formatearTiempo(restante)}
          </span>
        </div>
        <div className="subasta__card">
          <span className="subasta__label">Lances</span>
          <span className="subasta__valor">{subasta.cantidadLances}</span>
        </div>
      </div>

      <h2 className="form__titulo">Movimientos de precio</h2>
      <table className="tabla">
        <thead>
          <tr>
            <th>#</th>
            <th>Oferente</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          {subasta.montos.map((monto, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>Oferente {String.fromCharCode(65 + i)}</td>
              <td>{formatearPesos(monto)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

function formatearTiempo(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const min = String(Math.floor(total / 60)).padStart(2, '0')
  const seg = String(total % 60).padStart(2, '0')
  return `${min}:${seg}`
}
