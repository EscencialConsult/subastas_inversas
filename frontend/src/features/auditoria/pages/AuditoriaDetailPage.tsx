import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import { Alert } from '../../../shared/ui/Alert'
import { Button } from '../../../shared/ui/Button'
import { LoadingState } from '../../../shared/ui/StateViews'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PageShell } from '../../../shared/ui/PageShell'
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

  if (isLoading) return <LoadingState label="Cargando expediente..." />
  if (!data?.proceso) return <Alert variant="error">{getErrorMessage(error, 'No se pudo cargar el expediente.')}</Alert>

  const { proceso, subasta, invitaciones, evalResults, alertasRiesgo, nombres } = data

  return (
    <PageShell width="wide">
      <PageHeader
        title={<>Expediente · <code>{proceso.codigo}</code></>}
        actions={
          <Button variant="ghost" onClick={() => navigate('/auditoria')}>
            Volver
          </Button>
        }
      />

      <AuditoriaDetailSections
        proceso={proceso}
        subasta={subasta}
        invitaciones={invitaciones}
        evalResults={evalResults}
        alertasRiesgo={alertasRiesgo}
        nombres={nombres}
      />
    </PageShell>
  )
}
