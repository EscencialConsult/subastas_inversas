// Adjudicación por el COMPRADOR: tras cerrar la subasta, elige el proveedor
// ganador (propone). Queda pendiente de la aprobación de la Autoridad.
//
// En subasta inversa la mejor oferta es la más baja; viene preseleccionada,
// pero el comprador puede elegir otra si la más baja no corresponde.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { obtenerProceso, adjudicarProceso, obtenerResultadosEvaluacion } from '../../api/comprasApi.js'
import { obtenerSubastaDeProceso } from '../../api/subastasApi.js'

export function AdjudicarPage() {
  const { id } = useParams()
  const { tenantId, usuario } = useAuth()
  const navigate = useNavigate()

  const [proceso, setProceso] = useState(null)
  const [ofertas, setOfertas] = useState([])
  const [evalResults, setEvalResults] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [elegido, setElegido] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    try {
      const [p, s] = await Promise.all([
        obtenerProceso({ tenantId, id }),
        obtenerSubastaDeProceso({ tenantId, procesoId: id }),
      ])
      setProceso(p)
      const ordenadas = [...s.lances].sort((a, b) => a.monto - b.monto)
      setOfertas(ordenadas)

      try {
        const results = await obtenerResultadosEvaluacion({ tenantId, procesoId: id })
        if (results?.supplierEvaluations?.length > 0) {
          setEvalResults(results)
          const recommended = results.supplierEvaluations
            .filter(e => !e.isExcluded)
            .sort((a, b) => (b.totalWeightedScore ?? 0) - (a.totalWeightedScore ?? 0))[0]
          if (recommended) {
            setElegido(recommended.supplierName)
          } else {
            setElegido(ordenadas[0]?.proveedor ?? '')
          }
        } else {
          setElegido(ordenadas[0]?.proveedor ?? '')
        }
      } catch {
        setElegido(ordenadas[0]?.proveedor ?? '')
      }
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

  async function adjudicar(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      const oferta = ofertas.find((o) => o.proveedor === elegido)
      await adjudicarProceso({
        tenantId,
        id,
        compradorId: usuario.id,
        proveedor: elegido,
        monto: oferta?.monto ?? 0,
      })
      navigate('/compras')
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  if (cargando) return <p className="estado-cargando">Cargando…</p>
  if (!proceso) return <div className="alerta alerta--error">{error}</div>

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>
          Adjudicar · <code>{proceso.codigo}</code>
        </h1>
        <button className="btn btn--texto" onClick={() => navigate('/compras')}>
          Volver
        </button>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      <p className="proceso__descripcion">{proceso.titulo}</p>

      {/* Panel de resultados de evaluación */}
      {evalResults && (
        <div className="form" style={{ marginBottom: 20 }}>
          <h2 className="form__titulo">Resultados de la Evaluación</h2>
          <table className="tabla">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Oferta</th>
                <th>Score</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {evalResults.supplierEvaluations.map(e => {
                const oferta = ofertas.find(o => o.proveedor === e.supplierName)
                return (
                  <tr key={e.id} style={e.isExcluded ? { opacity: 0.5, textDecoration: 'line-through' } : { fontWeight: e.isExcluded ? 'normal' : 'bold' }}>
                    <td>{e.supplierName}</td>
                    <td>{oferta ? formatearPesos(oferta.monto) : '—'}</td>
                    <td>{e.isExcluded ? '—' : `${e.totalWeightedScore ?? 0}%`}</td>
                    <td>
                      {e.isExcluded ? (
                        <span className="badge badge--error" title={e.excludedReason || ''}>Excluido</span>
                      ) : (
                        <span className="badge badge--ok">Apto</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

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
              <td>{i === 0 && <span className="badge badge--ok">Más baja</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className="form" onSubmit={adjudicar} style={{ marginTop: 20 }}>
        <h2 className="form__titulo">Adjudicar al proveedor</h2>
        <label className="campo">
          <span>Proveedor ganador</span>
          <select value={elegido} onChange={(e) => setElegido(e.target.value)}>
            <option value="">Elegí un proveedor…</option>
            {ofertas.map((o) => (
              <option key={o.id} value={o.proveedor}>
                {o.proveedor} — {formatearPesos(o.monto)}
              </option>
            ))}
          </select>
        </label>

        <div className="alerta alerta--info">
          La adjudicación queda pendiente de aprobación de la Autoridad.
        </div>

        <div className="form__acciones">
          <button type="submit" className="btn btn--primario" disabled={guardando}>
            {guardando ? 'Adjudicando…' : 'Adjudicar'}
          </button>
        </div>
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
