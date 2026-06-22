// Pantalla de subasta — MAQUETA (monitor del comprador).
//
// Muestra cómo se vería la subasta inversa en vivo: mejor oferta actual,
// reloj de cuenta regresiva y el historial de lances. El reloj y el botón
// "Simular lance" son solo del frontend; la subasta real (lances en tiempo
// real, reloj autoritativo del servidor) se hace con el backend.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { obtenerProceso } from '../../api/comprasApi.js'
import {
  obtenerSubastaDeProceso,
  simularLance,
  cerrarSubasta,
  mejorOferta,
} from '../../api/subastasApi.js'

export function SubastaPage() {
  const { procesoId } = useParams()
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [proceso, setProceso] = useState(null)
  const [subasta, setSubasta] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [restante, setRestante] = useState(null) // ms hasta el cierre

  async function cargar() {
    try {
      const [p, s] = await Promise.all([
        obtenerProceso({ tenantId, id: procesoId }),
        obtenerSubastaDeProceso({ tenantId, procesoId }),
      ])
      setProceso(p)
      setSubasta(s)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(cargar, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, procesoId])

  // Reloj de cuenta regresiva (solo maqueta, basado en el reloj del navegador).
  useEffect(() => {
    if (!subasta) return
    const cierre =
      new Date(subasta.inicioISO).getTime() + subasta.duracionMin * 60000
    const tick = () => setRestante(cierre - Date.now())
    tick()
    const intervalo = setInterval(tick, 1000)
    return () => clearInterval(intervalo)
  }, [subasta])

  async function nuevoLance() {
    try {
      const s = await simularLance({ tenantId, procesoId })
      setSubasta(s)
    } catch (err) {
      setError(err.message)
    }
  }

  async function cerrar() {
    setError('')
    try {
      await cerrarSubasta({ tenantId, procesoId })
      navigate('/compras')
    } catch (err) {
      setError(err.message)
    }
  }

  if (cargando) return <p className="estado-cargando">Cargando subasta…</p>
  if (!subasta || !proceso)
    return <div className="alerta alerta--error">{error}</div>

  const cerrada = restante !== null && restante <= 0
  const mejor = mejorOferta(subasta)
  // Lances ordenados del más reciente arriba.
  const lancesOrdenados = [...subasta.lances].reverse()

  return (
    <section>
      <div className="alerta alerta--info">
        Maqueta de subasta. Los lances en tiempo real y el reloj del servidor se
        implementan con el backend.
      </div>

      <div className="encabezado">
        <h1>
          Subasta · <code>{proceso.codigo}</code>
        </h1>
        <button className="btn btn--texto" onClick={() => navigate('/compras')}>
          Volver
        </button>
      </div>
      <p className="proceso__descripcion">{proceso.titulo}</p>

      <div className="subasta__panel">
        <div className="subasta__card">
          <span className="subasta__label">Mejor oferta actual</span>
          <span className="subasta__valor subasta__valor--destacado">
            {formatearPesos(mejor)}
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
      </div>

      <div className="encabezado">
        <h2 className="form__titulo">Lances ({subasta.lances.length})</h2>
        <div className="tabla__acciones">
          {!cerrada && (
            <button className="btn btn--texto" onClick={nuevoLance}>
              Simular lance de proveedor
            </button>
          )}
          <button className="btn btn--primario" onClick={cerrar}>
            Cerrar subasta y enviar a evaluación
          </button>
        </div>
      </div>

      <table className="tabla">
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Monto</th>
            <th>Cuándo</th>
          </tr>
        </thead>
        <tbody>
          {lancesOrdenados.map((l) => (
            <tr key={l.id}>
              <td>{l.proveedor}</td>
              <td>{formatearPesos(l.monto)}</td>
              <td>{l.hace}</td>
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
