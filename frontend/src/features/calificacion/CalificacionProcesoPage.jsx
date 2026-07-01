import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, PenLine, SearchX, Shield, Users } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { obtenerProcesoParaEvaluacion, obtenerProveedoresDeProceso, firmarActaEvaluacion, descargarActaEvaluacionUrl } from '../../api/comprasApi'
import { etiquetaEstado } from '../../domain/compras'
import { SignaturePad } from '../../components/SignaturePad.jsx'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { Spinner } from '../../components/ui/Spinner.jsx'

const CLASE_CALIFICACION = {
  pendiente: 'info',
  aprobado: 'success',
  observado: 'warning',
  rechazado: 'error',
}

const ETIQUETA_CALIFICACION = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  observado: 'Observado',
  rechazado: 'Rechazado',
}

export function CalificacionProcesoPage() {
  const { tenantId, usuario } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()

  const [proceso, setProceso] = useState(null)
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mostrarFirmaModal, setMostrarFirmaModal] = useState(false)
  const [firmaCargando, setFirmaCargando] = useState(false)

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const [p, proveedoresData] = await Promise.all([
        obtenerProcesoParaEvaluacion({ tenantId, id }),
        obtenerProveedoresDeProceso({ tenantId, procesoId: id }),
      ])
      setProceso(p)
      setProveedores(proveedoresData)
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

  async function handleFirmarActa(signatureBase64) {
    setFirmaCargando(true)
    setError('')
    try {
      const pActualizado = await firmarActaEvaluacion({
        tenantId,
        procesoId: id,
        evaluatorId: usuario.id,
        signatureImage: signatureBase64,
      })
      setProceso(pActualizado)
      setMostrarFirmaModal(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setFirmaCargando(false)
    }
  }

  if (cargando) return <div className="flex justify-center py-12"><Spinner /></div>
  if (error) return <Alert variant="error">{error}</Alert>
  if (!proceso) return <EmptyState icon={SearchX} title="No encontrado" description="Proceso no encontrado." />

  const pendientes = proveedores.filter(s => !s.calificacion || s.calificacion.estado === 'pendiente').length

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <button className="btn btn--texto" onClick={() => navigate('/calificacion')}>
          &larr; Volver
        </button>
        <h1>{proceso.titulo}</h1>
        <p className="proceso__descripcion">
          <code>{proceso.codigo}</code> &middot; {etiquetaEstado(proceso.estado)}
          &middot; {proveedores.length} proveedor(es) aceptaron
          {pendientes > 0 && <span> &middot; <strong>{pendientes} pendiente(s)</strong></span>}
        </p>
      </div>

      {proveedores.length === 0 ? (
        <EmptyState icon={Users} title="Sin proveedores" description="No hay proveedores que hayan aceptado la invitación en este proceso." />
      ) : (
        <>
          <table className="tabla">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>CUIT</th>
                <th>Calificación</th>
                <th>Evaluador</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map(s => (
                <tr key={s.invitationId}>
                  <td>{s.businessName}</td>
                  <td><code>{s.cuit}</code></td>
                  <td>
                    {s.calificacion ? (
                      <Badge variant={CLASE_CALIFICACION[s.calificacion.estado] ?? 'info'}>
                        {ETIQUETA_CALIFICACION[s.calificacion.estado] ?? 'Pendiente'}
                      </Badge>
                    ) : (
                      <Badge variant="info">Pendiente</Badge>
                    )}
                  </td>
                  <td>{s.calificacion?.evaluador ?? '-'}</td>
                  <td>
                    <button
                      className="btn btn--primario btn--chico"
                      onClick={() => navigate(`/calificacion/${id}/${s.invitationId}`)}
                    >
                      {s.calificacion && s.calificacion.estado !== 'pendiente' ? 'Ver' : 'Calificar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Acta de Evaluación Section */}
          <div className="panel-grid" style={{ marginTop: '30px' }}>
            <div className="subasta__card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
              <h2 style={{ fontSize: '18px', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} /> Acta de Evaluación de Proveedores
              </h2>
              
              {proceso.isEvaluationActSigned ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <Badge variant="success">Firmada e Inmutable</Badge>
                    <span className="texto-muted" style={{ fontSize: '13px' }}>
                      Firmado por: <strong>{proceso.evaluationActSignedByName}</strong> el {new Date(proceso.evaluationActSignedAtUtc).toLocaleString()}
                    </span>
                  </div>
                  
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '5px' }}>
                        <span className="texto-muted" style={{ fontWeight: '600' }}>HASH SHA-256: </span>
                        <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontFamily: 'Courier New', fontSize: '12px', color: '#0f172a' }}>
                          {proceso.evaluationActHash}
                        </code>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '5px' }}>
                        <span className="texto-muted" style={{ fontWeight: '600' }}>FIRMA DIGITAL: </span>
                        <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontFamily: 'Courier New', fontSize: '12px', color: '#0f172a', wordBreak: 'break-all' }}>
                          {proceso.evaluationActSignature}
                        </code>
                      </div>
                    </div>
                  </div>

                  <div>
                    <a
                      href={descargarActaEvaluacionUrl({ tenantId, procesoId: id })}
                      download={`Acta-Evaluacion-${proceso.codigo}.pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn--primario"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      📄 Descargar Acta (PDF)
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {pendientes > 0 ? (
                    <Alert variant="warning" className="mt-4"><AlertTriangle size={16} className="inline" /> Debe calificar a todos los proveedores ({pendientes} pendiente(s)) antes de poder generar y firmar el acta.</Alert>
                  ) : (
                    <div>
                      <p className="texto-muted" style={{ fontSize: '14px', marginBottom: '15px' }}>
                        Todos los proveedores han sido calificados. Firme el acta de evaluación para habilitar el inicio de la subasta inversa.
                      </p>
                      <button
                        className="btn btn--primario"
                        onClick={() => setMostrarFirmaModal(true)}
                        disabled={firmaCargando}
                      >
                        <PenLine size={16} /> Firmar y Habilitar Subasta
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {mostrarFirmaModal && (
        <SignaturePad
          onConfirm={handleFirmarActa}
          onCancel={() => setMostrarFirmaModal(false)}
        />
      )}
    </section>
  )
}
