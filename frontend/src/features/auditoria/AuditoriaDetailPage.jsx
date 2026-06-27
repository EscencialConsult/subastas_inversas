// Expediente de auditoría: todo el recorrido del proceso en SOLO LECTURA.
// Reúne en un solo lugar lo que fue pasando: datos, aprobación, subasta,
// evaluación y adjudicación, con quién hizo cada cosa.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { obtenerProcesoParaAuditoria, listarInvitacionesProcesoAudit, obtenerResultadosEvaluacionParaAuditoria } from '../../api/comprasApi.js'
import { obtenerSubastaDeProcesoParaAuditoria, analisisSubasta } from '../../api/subastasApi.js'
import { nombresPorIds } from '../../api/usersApi.js'
import { etiquetaEstado, claseEstado } from '../../domain/compras.js'

export function AuditoriaDetailPage() {
  const { id } = useParams()
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [proceso, setProceso] = useState(null)
  const [subasta, setSubasta] = useState(null)
  const [invitaciones, setInvitaciones] = useState([])
  const [evalResults, setEvalResults] = useState(null)
  const [nombres, setNombres] = useState({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  async function cargar() {
    try {
      const p = await obtenerProcesoParaAuditoria({ tenantId, id })
      setProceso(p)

      // La subasta es opcional: si el proceso no llegó a esa etapa, no existe.
      try {
        setSubasta(await obtenerSubastaDeProcesoParaAuditoria({ tenantId, procesoId: id }))
      } catch {
        setSubasta(null)
      }

      try {
        setInvitaciones(await listarInvitacionesProcesoAudit({ tenantId, procesoId: id }))
      } catch {
        setInvitaciones([])
      }

      try {
        setEvalResults(await obtenerResultadosEvaluacionParaAuditoria({ tenantId, procesoId: id }))
      } catch {
        setEvalResults(null)
      }

      const ids = [
        p.compradorId,
        p.adjudicacion?.compradorId,
        p.aprobacion?.autoridadId,
      ].filter(Boolean)
      setNombres(await nombresPorIds({ ids }))
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

  if (cargando) return <p className="estado-cargando">Cargando expediente…</p>
  if (!proceso) return <div className="alerta alerta--error">{error}</div>

  const nombre = (idUsuario) => nombres[idUsuario] ?? '—'

  const estadoAprobacion = proceso.aprobacion?.estado
  const claseAdjudicacion = estadoAprobacion === 'rechazada' ? 'auditoria-seccion--rechazo' : 'auditoria-seccion--adjudicacion'
  const claseAprobacion = estadoAprobacion === 'rechazada' ? 'auditoria-seccion--rechazo' : 'auditoria-seccion--aprobacion'

  return (
    <section className="form-pagina auditoria-expediente">
      <div className="encabezado">
        <h1>
          Expediente · <code>{proceso.codigo}</code>
        </h1>
        <button className="btn btn--texto" onClick={() => navigate('/auditoria')}>
          Volver
        </button>
      </div>

      <div className="alerta alerta--info">
        Vista de auditoría: solo lectura. No se puede modificar nada desde acá.
      </div>

      <LineaDeTiempo proceso={proceso} subasta={subasta} invitaciones={invitaciones} evalResults={evalResults} />

      {/* Datos del proceso */}
      <div className="form">
        <h2 className="form__titulo">Datos del proceso</h2>
        <div className="auditoria-datos">
          <div className="auditoria-dato auditoria-dato--full">
            <span className="auditoria-dato__label">Título</span>
            <span className="auditoria-dato__valor">{proceso.titulo}</span>
          </div>
          <div className="auditoria-dato auditoria-dato--full">
            <span className="auditoria-dato__label">Descripción</span>
            <span className="auditoria-dato__valor">{proceso.descripcion || '—'}</span>
          </div>
          <div className="auditoria-dato">
            <span className="auditoria-dato__label">Presupuesto estimado</span>
            <span className="auditoria-dato__valor">{formatearPesos(proceso.presupuestoEstimado)}</span>
          </div>
          <div className="auditoria-dato">
            <span className="auditoria-dato__label">Creado el</span>
            <span className="auditoria-dato__valor">{proceso.creadoEn}</span>
          </div>
          <div className="auditoria-dato">
            <span className="auditoria-dato__label">Comprador</span>
            <span className="auditoria-dato__valor">{nombre(proceso.compradorId)}</span>
          </div>
          <div className="auditoria-dato">
            <span className="auditoria-dato__label">Estado actual</span>
            <span className="auditoria-dato__valor">
              <span className={`badge ${claseEstado(proceso.estado)}`}>
                {etiquetaEstado(proceso.estado)}
              </span>
            </span>
          </div>
          {proceso.specificationsHash && (
            <div className="auditoria-dato auditoria-dato--full">
              <span className="auditoria-dato__label">Hash de Especificaciones</span>
              <span className="auditoria-dato__valor"><code>{proceso.specificationsHash}</code></span>
            </div>
          )}
        </div>
      </div>

      {/* Ítems del proceso */}
      {proceso.items?.length > 0 && (
        <div className="form">
          <h2 className="form__titulo">Ítems ({proceso.items.length})</h2>
          <table className="tabla">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Unidad</th>
                <th>Precio Unitario Est.</th>
              </tr>
            </thead>
            <tbody>
              {proceso.items.map((item, idx) => (
                <tr key={item.id ?? idx}>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit}</td>
                  <td>{item.estimatedUnitPrice ? formatearPesos(Number(item.estimatedUnitPrice)) : '---'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invitaciones a proveedores */}
      {invitaciones.length > 0 && (
        <div className="form">
          <h2 className="form__titulo">Invitaciones ({invitaciones.length})</h2>
          <table className="tabla">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>CUIT</th>
                <th>Estado</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {invitaciones.map((inv) => {
                const est = inv.estado === 'pendiente' ? { texto: 'Pendiente', clase: 'badge--warn' } :
                            inv.estado === 'aceptada' ? { texto: 'Aceptada', clase: 'badge--ok' } :
                            { texto: 'Rechazada', clase: 'badge--error' }
                return (
                  <tr key={inv.id}>
                    <td>{inv.proveedor}</td>
                    <td><code>{inv.cuit}</code></td>
                    <td>
                      <span className={`badge ${est.clase}`}>{est.texto}</span>
                    </td>
                    <td>
                      {inv.estado === 'rechazada' && inv.rejectionReason
                        ? `Rechazado: ${inv.rejectionReason}`
                        : inv.estado === 'aceptada'
                          ? 'Confirmado'
                          : 'Esperando respuesta'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Subasta (si existió): análisis + lances. */}
      {subasta && (
        <div className="form">
          <h2 className="form__titulo">Subasta</h2>
          {(() => {
            const a = analisisSubasta(subasta)
            return (
              <div className="auditoria-datos">
                <div className="auditoria-dato">
                  <span className="auditoria-dato__label">Proveedores que ofertaron</span>
                  <span className="auditoria-dato__valor">{a.oferentes}</span>
                </div>
                <div className="auditoria-dato">
                  <span className="auditoria-dato__label">Lances totales</span>
                  <span className="auditoria-dato__valor">{a.cantidadLances}</span>
                </div>
                <div className="auditoria-dato">
                  <span className="auditoria-dato__label">Presupuesto base</span>
                  <span className="auditoria-dato__valor">{formatearPesos(a.base)}</span>
                </div>
                <div className="auditoria-dato">
                  <span className="auditoria-dato__label">Mejor oferta</span>
                  <span className="auditoria-dato__valor">{formatearPesos(a.mejor)}</span>
                </div>
                <div className="auditoria-dato">
                  <span className="auditoria-dato__label">Baja lograda</span>
                  <span className="auditoria-dato__valor">
                    {a.bajaPorcentaje.toFixed(1)}% (
                    {a.nivelBaja === 'alta'
                      ? 'baja alta'
                      : a.nivelBaja === 'moderada'
                        ? 'baja moderada'
                        : 'baja chica'}
                    )
                  </span>
                </div>
              </div>
            )
          })()}
          {subasta.lances.length > 0 && (
            <>
              <h3 className="form__subtitulo">Lances ({subasta.lances.length})</h3>
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Proveedor</th>
                    <th>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {[...subasta.lances]
                    .sort((a, b) => a.monto - b.monto)
                    .map((l) => (
                      <tr key={l.id}>
                        <td>{l.proveedor}</td>
                        <td>{formatearPesos(l.monto)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Evaluación con criterios */}
      {evalResults && evalResults.supplierEvaluations.length > 0 && (
        <div className="form">
          <h2 className="form__titulo">Evaluación con Criterios</h2>
          {evalResults.criteria.length > 0 && (
            <div className="auditoria-datos" style={{ marginBottom: '12px' }}>
              <div className="auditoria-dato auditoria-dato--full">
                <span className="auditoria-dato__label">Criterios definidos</span>
                <span className="auditoria-dato__valor">
                  {evalResults.criteria.filter(c => c.type === 'Exclusionary').length > 0 && (
                    <span>Excluyentes: {evalResults.criteria.filter(c => c.type === 'Exclusionary').map(c => c.name).join(', ')}</span>
                  )}
                  {evalResults.criteria.filter(c => c.type === 'Weighted').length > 0 && (
                    <span style={{ marginLeft: evalResults.criteria.filter(c => c.type === 'Exclusionary').length > 0 ? '16px' : 0 }}>
                      Ponderados: {evalResults.criteria.filter(c => c.type === 'Weighted').map(c => `${c.name} (${c.weight}%)`).join(', ')}
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}
          <table className="tabla">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Score</th>
                <th>Excluido</th>
              </tr>
            </thead>
            <tbody>
              {evalResults.supplierEvaluations.map(e => (
                <tr key={e.id}>
                  <td>{e.supplierName}</td>
                  <td>{e.isExcluded ? '—' : `${e.totalWeightedScore ?? 0}%`}</td>
                  <td>
                    {e.isExcluded ? (
                      <span className="badge badge--error" title={e.excludedReason || ''}>Sí</span>
                    ) : (
                      <span className="badge badge--ok">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjudicación propuesta por el comprador (si existió). */}
      {proceso.adjudicacion && (
        <div className={`form ${claseAdjudicacion}`}>
          <h2 className="form__titulo">Adjudicación</h2>
          <div className="auditoria-datos">
            <div className="auditoria-dato auditoria-dato--full">
              <span className="auditoria-dato__label">Adjudicado a</span>
              <span className="auditoria-dato__valor">{proceso.adjudicacion.proveedor}</span>
            </div>
            <div className="auditoria-dato">
              <span className="auditoria-dato__label">Monto</span>
              <span className="auditoria-dato__valor">{formatearPesos(proceso.adjudicacion.monto)}</span>
            </div>
            <div className="auditoria-dato">
              <span className="auditoria-dato__label">Propuesto por</span>
              <span className="auditoria-dato__valor">{nombre(proceso.adjudicacion.compradorId)}</span>
            </div>
            <div className="auditoria-dato">
              <span className="auditoria-dato__label">Fecha</span>
              <span className="auditoria-dato__valor">{proceso.adjudicacion.fecha}</span>
            </div>
          </div>
        </div>
      )}

      {/* Aprobación de la autoridad (si ya decidió). */}
      {proceso.aprobacion && (
        <div className={`form ${claseAprobacion}`}>
          <h2 className="form__titulo">Aprobación de la Autoridad</h2>
          <div className="auditoria-datos">
            <div className="auditoria-dato">
              <span className="auditoria-dato__label">Resultado</span>
              <span className="auditoria-dato__valor">
                {estadoAprobacion === 'aprobada' ? 'Aprobada' : 'Rechazada'}
              </span>
            </div>
            <div className="auditoria-dato">
              <span className="auditoria-dato__label">Por</span>
              <span className="auditoria-dato__valor">{nombre(proceso.aprobacion.autoridadId)}</span>
            </div>
            <div className="auditoria-dato">
              <span className="auditoria-dato__label">Fecha</span>
              <span className="auditoria-dato__valor">{proceso.aprobacion.fecha}</span>
            </div>
            {proceso.aprobacion.motivo && (
              <div className="auditoria-dato auditoria-dato--full">
                <span className="auditoria-dato__label">Motivo</span>
                <span className="auditoria-dato__valor">{proceso.aprobacion.motivo}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

// Cronología del expediente: arma los eventos a partir de las fechas guardadas
// y los muestra ordenados. Es la "traza" del proceso para el auditor.
function LineaDeTiempo({ proceso, subasta, invitaciones, evalResults }) {
  const eventos = [
    { fecha: proceso.creadoEn, texto: 'Proceso creado', tipo: 'creado' },
  ]

  if (invitaciones?.length > 0) {
    eventos.push({
      fecha: invitaciones[0].invitadoEn?.slice(0, 10) ?? proceso.creadoEn,
      texto: `Invitaciones enviadas a ${invitaciones.length} proveedores`,
      tipo: 'invitacion',
    })
  }

  if (subasta) {
    eventos.push({
      fecha: subasta.inicioISO.slice(0, 10),
      texto: `Subasta realizada (${subasta.lances.length} lances)`,
      tipo: 'subasta',
    })
  }
  if (evalResults?.supplierEvaluations?.length > 0) {
    eventos.push({
      fecha: evalResults.supplierEvaluations[0].evaluatedAtUtc?.slice(0, 10) ?? proceso.creadoEn,
      texto: `Evaluación registrada (${evalResults.supplierEvaluations.filter(e => !e.isExcluded).length} aptos)`,
      tipo: 'evaluacion',
    })
  }
  if (proceso.adjudicacion) {
    eventos.push({
      fecha: proceso.adjudicacion.fecha,
      texto: `Adjudicado a ${proceso.adjudicacion.proveedor}`,
      tipo: 'adjudicacion',
    })
  }
  if (proceso.aprobacion) {
    eventos.push({
      fecha: proceso.aprobacion.fecha,
      texto:
        proceso.aprobacion.estado === 'aprobada'
          ? 'Adjudicación aprobada por la Autoridad'
          : 'Adjudicación rechazada por la Autoridad',
      tipo: 'aprobacion',
    })
  }

  eventos.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))

  return (
    <div className="form">
      <h2 className="form__titulo">Línea de tiempo</h2>
      <ol className="timeline">
        {eventos.map((e, i) => (
          <li key={i} className={`timeline__item timeline__item--${e.tipo}`}>
            <span className="timeline__fecha">{e.fecha}</span>
            <span className="timeline__texto">{e.texto}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
