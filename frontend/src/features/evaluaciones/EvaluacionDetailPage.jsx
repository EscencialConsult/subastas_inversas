// Detalle de evaluación: el evaluador ve las ofertas de la subasta y recomienda
// un ganador. En subasta inversa, la mejor oferta es la de MENOR monto, pero el
// evaluador puede recomendar otra si la más baja no cumple requisitos.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { obtenerProceso, registrarEvaluacion } from '../../api/comprasApi.js'
import { obtenerSubastaDeProceso } from '../../api/subastasApi.js'

export function EvaluacionDetailPage() {
  const { id } = useParams()
  const { tenantId, usuario } = useAuth()
  const navigate = useNavigate()

  const [proceso, setProceso] = useState(null)
  const [ofertas, setOfertas] = useState([]) // lances ordenados (menor primero)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [recomendado, setRecomendado] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    try {
      const [p, s] = await Promise.all([
        obtenerProceso({ tenantId, id }),
        obtenerSubastaDeProceso({ tenantId, procesoId: id }),
      ])
      setProceso(p)
      // Subasta inversa: ordenamos de menor a mayor (la mejor oferta arriba).
      const ordenadas = [...s.lances].sort((a, b) => a.monto - b.monto)
      setOfertas(ordenadas)
      // Por defecto, recomendamos la oferta más baja (si no hay evaluación previa).
      setRecomendado(p.evaluacion?.recomendadoProveedor ?? ordenadas[0]?.proveedor ?? '')
      setObservaciones(p.evaluacion?.observaciones ?? '')
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
  }, [tenantId, id])

  async function guardar(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await registrarEvaluacion({
        tenantId,
        id,
        evaluadorId: usuario.id,
        recomendadoProveedor: recomendado,
        observaciones,
      })
      navigate('/evaluaciones')
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  if (cargando) return <p className="estado-cargando">Cargando…</p>
  if (!proceso) return <div className="alerta alerta--error">{error}</div>

  const yaEvaluado = Boolean(proceso.evaluacion)

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>
          Evaluación · <code>{proceso.codigo}</code>
        </h1>
        <button className="btn btn--texto" onClick={() => navigate('/evaluaciones')}>
          Volver
        </button>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      <p className="proceso__descripcion">{proceso.titulo}</p>

      <h2 className="form__titulo">Ofertas recibidas</h2>
      <table className="tabla">
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Monto</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {ofertas.map((o, i) => (
            <tr key={o.id}>
              <td>{o.proveedor}</td>
              <td>{formatearPesos(o.monto)}</td>
              <td>
                {i === 0 && <span className="badge badge--ok">Más baja</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className="form" onSubmit={guardar} style={{ marginTop: 20 }}>
        <h2 className="form__titulo">
          {yaEvaluado ? 'Evaluación registrada' : 'Registrar evaluación'}
        </h2>

        <label className="campo">
          <span>Proveedor recomendado</span>
          <select
            value={recomendado}
            onChange={(e) => setRecomendado(e.target.value)}
            disabled={yaEvaluado}
          >
            <option value="">Elegí un proveedor…</option>
            {ofertas.map((o) => (
              <option key={o.id} value={o.proveedor}>
                {o.proveedor} — {formatearPesos(o.monto)}
              </option>
            ))}
          </select>
        </label>

        <label className="campo">
          <span>Observaciones</span>
          <textarea
            rows={3}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            disabled={yaEvaluado}
            placeholder="Fundamentación de la recomendación…"
          />
        </label>

        {!yaEvaluado && (
          <div className="form__acciones">
            <button type="submit" className="btn btn--primario" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Registrar evaluación'}
            </button>
          </div>
        )}

        {yaEvaluado && (
          <div className="alerta alerta--info">
            Evaluación registrada. Queda pendiente la adjudicación por parte del aprobador.
          </div>
        )}
      </form>
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
