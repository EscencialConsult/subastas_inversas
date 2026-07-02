// Adjudicación por el COMPRADOR: tras cerrar la subasta, elige el proveedor
// ganador (propone). Queda pendiente de la aprobación de la Autoridad.
//
// En subasta inversa la mejor oferta es la más baja; viene preseleccionada,
// pero el comprador puede elegir otra si la más baja no corresponde.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import {
  adjudicarProceso,
  declararProcesoDesierto,
  obtenerDictamenAsistido,
  obtenerProceso,
  obtenerResultadosEvaluacion,
  suspenderProcesoPorImpugnacion,
} from '../../shared/api/comprasApi'
import { obtenerSubastaDeProceso } from '../../shared/api/subastasApi'
import { Badge } from '../../shared/ui/Badge'
import { Alert } from '../../shared/ui/Alert'
import { Spinner } from '../../shared/ui/Spinner.jsx'

export function AdjudicarPage() {
  const { id } = useParams()
  const { tenantId, usuario } = useAuth()
  const navigate = useNavigate()

  const [proceso, setProceso] = useState(null)
  const [ofertas, setOfertas] = useState([])
  const [evalResults, setEvalResults] = useState(null)
  const [dictamen, setDictamen] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [elegido, setElegido] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [accionExcepcion, setAccionExcepcion] = useState(null)
  const [fundamento, setFundamento] = useState('')

  async function cargar() {
    try {
      const [p, s, d] = await Promise.all([
        obtenerProceso({ tenantId, id }),
        obtenerSubastaDeProceso({ tenantId, procesoId: id }),
        obtenerDictamenAsistido({ tenantId, procesoId: id }).catch(() => null),
      ])
      setProceso(p)
      setDictamen(d)
      const ordenadas = [...s.lances].sort((a, b) => a.monto - b.monto)
      setOfertas(ordenadas)
      if (d?.tieneRecomendacion) {
        setElegido(d.proveedor)
      }

      try {
        const results = await obtenerResultadosEvaluacion({ tenantId, procesoId: id })
        if (results?.supplierEvaluations?.length > 0) {
          setEvalResults(results)
          const recommended = results.supplierEvaluations
            .filter(e => !e.isExcluded)
            .sort((a, b) => (b.totalWeightedScore ?? 0) - (a.totalWeightedScore ?? 0))[0]
          if (!d?.tieneRecomendacion && recommended) {
            setElegido(recommended.supplierName)
          } else if (!d?.tieneRecomendacion) {
            setElegido(ordenadas[0]?.proveedor ?? '')
          }
        } else {
          if (!d?.tieneRecomendacion) setElegido(ordenadas[0]?.proveedor ?? '')
        }
      } catch {
        if (!d?.tieneRecomendacion) setElegido(ordenadas[0]?.proveedor ?? '')
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

  async function confirmarExcepcion() {
    setError('')
    setGuardando(true)
    try {
      if (accionExcepcion === 'desierto') {
        await declararProcesoDesierto({ tenantId, id, operadorId: usuario.id, fundamento })
      } else {
        await suspenderProcesoPorImpugnacion({ tenantId, id, operadorId: usuario.id, fundamento })
      }
      navigate('/compras')
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  if (cargando) return <div className="flex justify-center py-12"><Spinner /></div>
  if (!proceso) return <Alert variant="error">{error}</Alert>

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

      {error && <Alert variant="error">{error}</Alert>}

      <p className="proceso__descripcion">{proceso.titulo}</p>

      {dictamen && (
        <div className="form" style={{ marginBottom: 20 }}>
          <h2 className="form__titulo">Dictamen asistido</h2>
          <Alert variant="info">{dictamen.resumen}</Alert>
          {dictamen.tieneRecomendacion && (
            <div className="subasta__panel" style={{ marginBottom: 16 }}>
              <MetricCard etiqueta="Ganador sugerido" valor={dictamen.proveedor} />
              <MetricCard etiqueta="Oferta sugerida" valor={formatearPesos(dictamen.monto)} destacado />
              <MetricCard etiqueta="Ahorro" valor={`${formatearPesos(dictamen.ahorroMonto)} (${Number(dictamen.ahorroPorcentaje ?? 0).toFixed(2)}%)`} />
              <MetricCard etiqueta="Puntaje tecnico" valor={dictamen.puntajeTecnico == null ? 'Sin puntaje' : `${dictamen.puntajeTecnico}%`} />
            </div>
          )}
          <h3 className="form__subtitulo">Riesgos detectados</h3>
          {dictamen.riesgos.length > 0 ? (
            <div className="flex flex-col gap-8">
              {dictamen.riesgos.map((riesgo) => (
                <div className={`alerta ${riesgo.severidad === 'high' ? 'alerta--error' : 'alerta--info'}`} key={riesgo.codigo}>
                  {riesgo.mensaje}
                </div>
              ))}
            </div>
          ) : (
            <Alert variant="info">No se detectaron riesgos relevantes para la recomendacion.</Alert>
          )}
        </div>
      )}

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
                        <Badge variant="error" className="cursor-help" title={e.excludedReason || ''}>Excluido</Badge>
                      ) : (
                        <Badge variant="success">Apto</Badge>
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
              <td>{i === 0 && <Badge variant="success">Más baja</Badge>}</td>
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

        <Alert variant="info">La adjudicación queda pendiente de aprobación de la Autoridad.</Alert>

        <div className="form__acciones">
          <button
            type="button"
            className="btn btn--texto"
            disabled={guardando}
            onClick={() => setAccionExcepcion('impugnacion')}
          >
            Suspender por impugnacion
          </button>
          <button
            type="button"
            className="btn btn--peligro"
            disabled={guardando}
            onClick={() => setAccionExcepcion('desierto')}
          >
            Declarar desierto
          </button>
          <button type="submit" className="btn btn--primario" disabled={guardando}>
            {guardando ? 'Adjudicando…' : 'Adjudicar'}
          </button>
        </div>
      </form>

      {accionExcepcion && (
        <div className="form" style={{ marginTop: 20 }}>
          <h2 className="form__titulo">
            {accionExcepcion === 'desierto' ? 'Declarar desierto' : 'Suspender por impugnacion'}
          </h2>
          <label className="campo">
            <span>Fundamento</span>
            <textarea
              rows={4}
              value={fundamento}
              onChange={(e) => setFundamento(e.target.value)}
              placeholder={accionExcepcion === 'desierto'
                ? 'Detalla por que corresponde declarar desierto el proceso...'
                : 'Detalla la impugnacion y el motivo de suspension...'}
            />
          </label>
          <div className="form__acciones">
            <button
              type="button"
              className="btn btn--texto"
              disabled={guardando}
              onClick={() => {
                setAccionExcepcion(null)
                setFundamento('')
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--peligro"
              disabled={guardando}
              onClick={confirmarExcepcion}
            >
              {guardando ? 'Procesando...' : 'Confirmar'}
            </button>
          </div>
        </div>
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

function MetricCard({ etiqueta, valor, destacado = false }) {
  return (
    <article className="subasta__card">
      <span className="subasta__label">{etiqueta}</span>
      <span className={`subasta__valor ${destacado ? 'subasta__valor--destacado' : ''}`}>{valor}</span>
    </article>
  )
}
