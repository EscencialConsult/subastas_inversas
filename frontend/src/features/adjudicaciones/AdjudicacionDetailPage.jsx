// Detalle de adjudicación: el aprobador ve la recomendación del evaluador y
// las ofertas, y adjudica al proveedor recomendado (cierre del circuito).

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { obtenerProceso, adjudicarProceso } from '../../api/comprasApi.js'
import { obtenerSubastaDeProceso } from '../../api/subastasApi.js'

export function AdjudicacionDetailPage() {
  const { id } = useParams()
  const { tenantId, usuario } = useAuth()
  const navigate = useNavigate()

  const [proceso, setProceso] = useState(null)
  const [ofertas, setOfertas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [procesando, setProcesando] = useState(false)

  async function cargar() {
    try {
      const [p, s] = await Promise.all([
        obtenerProceso({ tenantId, id }),
        obtenerSubastaDeProceso({ tenantId, procesoId: id }),
      ])
      setProceso(p)
      setOfertas([...s.lances].sort((a, b) => a.monto - b.monto))
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

  async function adjudicar() {
    setError('')
    setProcesando(true)
    try {
      await adjudicarProceso({ tenantId, id, aprobadorId: usuario.id })
      navigate('/adjudicaciones')
    } catch (err) {
      setError(err.message)
      setProcesando(false)
    }
  }

  if (cargando) return <p className="estado-cargando">Cargando…</p>
  if (!proceso) return <div className="alerta alerta--error">{error}</div>

  const recomendado = proceso.evaluacion?.recomendadoProveedor
  const ofertaRecomendada = ofertas.find((o) => o.proveedor === recomendado)

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

      {error && <div className="alerta alerta--error">{error}</div>}

      <p className="proceso__descripcion">{proceso.titulo}</p>

      <div className="form">
        <h2 className="form__titulo">Recomendación del evaluador</h2>
        <div className="perfil__solo-lectura">
          <span>Proveedor recomendado: {recomendado}</span>
          {ofertaRecomendada && (
            <span>Monto: {formatearPesos(ofertaRecomendada.monto)}</span>
          )}
          {proceso.evaluacion?.observaciones && (
            <span>Observaciones: {proceso.evaluacion.observaciones}</span>
          )}
        </div>

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
            {ofertas.map((o) => (
              <tr key={o.id}>
                <td>{o.proveedor}</td>
                <td>{formatearPesos(o.monto)}</td>
                <td>
                  {o.proveedor === recomendado && (
                    <span className="badge badge--ok">Recomendado</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="form__acciones">
          <button
            className="btn btn--texto"
            onClick={() => navigate('/adjudicaciones')}
          >
            Cancelar
          </button>
          <button className="btn btn--primario" onClick={adjudicar} disabled={procesando}>
            {procesando ? 'Procesando…' : `Adjudicar a ${recomendado}`}
          </button>
        </div>
      </div>
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
