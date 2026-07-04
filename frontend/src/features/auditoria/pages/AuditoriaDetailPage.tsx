import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import { Alert } from '../../../shared/ui/Alert'
import { Spinner } from '../../../shared/ui/Spinner'
import { getErrorMessage } from '../../../shared/query/queryClient'
import { AuditoriaDetailSections } from '../components/AuditoriaDetailSections'
import { auditoriaDetailQuery, auditoriaKeys } from '../data/auditoriaData'

export function AuditoriaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: auditoriaKeys.detail(tenantId, id),
    queryFn: () => auditoriaDetailQuery({ tenantId, id }),
    enabled: Boolean(tenantId && id),
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (!data?.proceso) return <Alert variant="error">{getErrorMessage(error, 'No se pudo cargar el expediente.')}</Alert>

  const { proceso, subasta, invitaciones, evalResults, alertasRiesgo, nombres } = data

  return (
    <section className="form-pagina auditoria-expediente">
      <div className="encabezado">
        <h1>
          Expediente · <code>{proceso.codigo}</code>
        </h1>
        <button className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60" onClick={() => navigate('/auditoria')}>
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
