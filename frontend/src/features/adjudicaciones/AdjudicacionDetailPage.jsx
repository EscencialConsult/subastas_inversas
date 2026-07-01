// Detalle para la AUTORIDAD: ve la adjudicación propuesta por el comprador y
// las ofertas, y la aprueba o la rechaza (con motivo).

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import {
  obtenerProcesoParaAprobacion,
  aprobarAdjudicacion,
  devolverAdjudicacion,
  rechazarAdjudicacion,
} from '../../api/comprasApi'
import { obtenerSubastaDeProcesoParaAprobacion, analisisSubasta } from '../../api/subastasApi'
import { ESTADO_PROCESO } from '../../domain/compras'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner.jsx'

export function AdjudicacionDetailPage() {
  const { id } = useParams()
  const { tenantId, usuario } = useAuth()
  const navigate = useNavigate()

  const [proceso, setProceso] = useState(null)
  const [subasta, setSubasta] = useState(null)
  const [ofertas, setOfertas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [accionMotivo, setAccionMotivo] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [procesando, setProcesando] = useState(false)

  async function cargar() {
    try {
      const p = await obtenerProcesoParaAprobacion({ tenantId, id })
      setProceso(p)

      if (p.tieneSubasta) {
        const s = await obtenerSubastaDeProcesoParaAprobacion({ tenantId, procesoId: id })
        setSubasta(s)
        setOfertas([...s.lances].sort((a, b) => a.monto - b.monto))
      } else {
        setSubasta(null)
        setOfertas([])
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

  async function aprobar() {
    setError('')
    setProcesando(true)
    try {
      await aprobarAdjudicacion({ tenantId, id, autoridadId: usuario.id })
      navigate('/adjudicaciones')
    } catch (err) {
      setError(err.message)
      setProcesando(false)
    }
  }

  async function confirmarRechazo() {
    setError('')
    setProcesando(true)
    try {
      if (accionMotivo === 'devolver') {
        await devolverAdjudicacion({ tenantId, id, autoridadId: usuario.id, motivo })
      } else {
        await rechazarAdjudicacion({ tenantId, id, autoridadId: usuario.id, motivo })
      }
      navigate('/adjudicaciones')
    } catch (err) {
      setError(err.message)
      setProcesando(false)
    }
  }

  if (cargando) return <div className="flex justify-center py-12"><Spinner /></div>
  if (!proceso) return <Alert variant="error">{error}</Alert>

  const pendiente = proceso.estado === ESTADO_PROCESO.ADJUDICADA
  const estaDevolviendo = accionMotivo === 'devolver'
  const adj = proceso.adjudicacion
  const adjudicado = adj?.proveedor

  const analisis = subasta ? analisisSubasta(subasta) : null
  const masBaja = ofertas[0] ?? null
  const adjudicaNoEsLaMasBaja = adj && masBaja && !esOfertaAdjudicada(masBaja, adj)

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>
          Adjudicación · <code>{proceso.codigo}</code>
        </h1>
        <button className="btn btn--texto" onClick={() => navigate('/adjudicaciones')}>
          Volver
        </button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <p className="proceso__descripcion">{proceso.titulo}</p>

      <div className="form">
        <h2 className="form__titulo">Adjudicación propuesta</h2>
        <div className="perfil__solo-lectura">
          <span>Proveedor: {adjudicado ?? '—'}</span>
          {adj && <span>Monto: {formatearPesos(adj.monto)}</span>}
          {adj && <span>Propuesta el: {adj.fecha}</span>}
          {adj?.documentHash && <span>Hash acta: <code>{adj.documentHash.slice(0, 16)}</code></span>}
          {adj?.immutableHash && <span>Hash registro: <code>{adj.immutableHash.slice(0, 16)}</code></span>}
        </div>

        {/* Contexto de la subasta para que la Autoridad decida con información. */}
        {analisis && (
          <>
            <h2 className="form__titulo">Resultado de la subasta</h2>
            <div className="perfil__solo-lectura">
              <span>Proveedores que ofertaron: {analisis.oferentes}</span>
              <span>Presupuesto base: {formatearPesos(analisis.base)}</span>
              <span>Oferta más baja: {formatearPesos(analisis.mejor)}</span>
              <span>Baja lograda: {analisis.bajaPorcentaje.toFixed(1)}%</span>
            </div>
          </>
        )}

        {/* Aviso de gobernanza: si NO se adjudicó a la oferta más baja. */}
        {adjudicaNoEsLaMasBaja && (
          <Alert variant="info">Atención: la adjudicación propuesta no es la oferta más baja
            ({masBaja?.proveedor}, {formatearPesos(masBaja?.monto)}). Revisá la
            justificación antes de aprobar.</Alert>
        )}

        <h2 className="form__titulo">Ofertas</h2>
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
                <td className="tabla__acciones">
{i === 0 && <Badge variant="neutral">Más baja</Badge>}
                  {esOfertaAdjudicada(o, adj) && (
                    <Badge variant="success">Adjudicado</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pendiente && !accionMotivo && (
          <div className="form__acciones">
            <button
              className="btn btn--peligro"
              onClick={() => setAccionMotivo('rechazar')}
              disabled={procesando}
            >
              Rechazar
            </button>
            <button
              className="btn btn--secundario"
              onClick={() => setAccionMotivo('devolver')}
              disabled={procesando}
            >
              Devolver
            </button>
            <button className="btn btn--primario" onClick={aprobar} disabled={procesando}>
              {procesando ? 'Procesando…' : 'Aprobar adjudicación'}
            </button>
          </div>
        )}

        {pendiente && accionMotivo && (
          <div className="rechazo">
            <label className="campo">
              <span>{estaDevolviendo ? 'Motivo de la devolucion' : 'Motivo del rechazo'}</span>
              <textarea
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={estaDevolviendo
                  ? 'Indicá qué debe corregir el equipo evaluador…'
                  : 'Explicá por qué se rechaza la adjudicación…'}
              />
            </label>
            <div className="form__acciones">
              <button
                className="btn btn--texto"
                onClick={() => {
                  setAccionMotivo(null)
                  setMotivo('')
                }}
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                className="btn btn--peligro"
                onClick={confirmarRechazo}
                disabled={procesando}
              >
                {procesando
                  ? 'Procesando…'
                  : estaDevolviendo
                    ? 'Confirmar devolución'
                    : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        )}

        {!pendiente && (
          <Alert variant="info">Esta adjudicación ya fue resuelta.</Alert>
        )}
      </div>
    </section>
  )
}

function esOfertaAdjudicada(oferta, adjudicacion) {
  if (!oferta || !adjudicacion) return false

  return oferta.proveedor === adjudicacion.proveedor && Number(oferta.monto) === Number(adjudicacion.monto)
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
