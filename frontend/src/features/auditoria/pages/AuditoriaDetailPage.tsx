import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import { obtenerProcesoParaAuditoria, listarInvitacionesProcesoAudit, obtenerResultadosEvaluacionParaAuditoria } from '../../../shared/api/comprasApi'
import { obtenerSubastaDeProcesoParaAuditoria } from '../../../shared/api/subastasApi'
import { listarAlertasRiesgo } from '../../../shared/api/auditoriaApi'
import { nombresPorIds } from '../../../shared/api/usersApi'
import { Alert } from '../../../shared/ui/Alert'
import { Spinner } from '../../../shared/ui/Spinner'
import { AuditoriaDetailSections } from '../components/AuditoriaDetailSections'

export function AuditoriaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [proceso, setProceso] = useState<any>(null)
  const [subasta, setSubasta] = useState<any>(null)
  const [invitaciones, setInvitaciones] = useState<any[]>([])
  const [evalResults, setEvalResults] = useState<any>(null)
  const [alertasRiesgo, setAlertasRiesgo] = useState<any[]>([])
  const [nombres, setNombres] = useState<Record<string, string>>({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  async function cargar() {
    if (!tenantId || !id) return
    try {
      const p = await obtenerProcesoParaAuditoria({ tenantId, id })
      setProceso(p)

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

      try {
        setAlertasRiesgo(await listarAlertasRiesgo({ tenantId, procesoId: id }))
      } catch {
        setAlertasRiesgo([])
      }

      const adjudicacion = p.adjudicacion as any
      const aprobacion = p.aprobacion as any
      const ids = [
        p.compradorId,
        adjudicacion?.compradorId,
        aprobacion?.autoridadId,
      ].filter(Boolean)
      setNombres(await nombresPorIds({ tenantId, ids }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el expediente.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, id])

  if (cargando) return <div className="flex justify-center py-12"><Spinner /></div>
  if (!proceso) return <Alert variant="error">{error}</Alert>

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

      <AuditoriaDetailSections
        proceso={proceso}
        subasta={subasta}
        invitaciones={invitaciones}
        evalResults={evalResults}
        alertasRiesgo={alertasRiesgo}
        nombres={nombres}
      />
    </section>
  )
}
