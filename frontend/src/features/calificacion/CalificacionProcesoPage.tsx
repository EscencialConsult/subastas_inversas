import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, Download, PenLine, SearchX, Shield, Users } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { puedeCalificarProveedores, puedeFirmarActaEvaluacion } from '../../auth/permisos'
import { etiquetaEstado } from '../../domain/compras'
import { getErrorMessage } from '../../shared/query/queryClient'
import { SignaturePad } from '../../shared/ui/SignaturePad'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { DataTable, type DataTableColumn } from '../../shared/ui/DataTable'
import { EmptyState } from '../../shared/ui/EmptyState'
import { FormSection } from '../../shared/ui/FormSection'
import { LoadingState } from '../../shared/ui/StateViews'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import {
  calificacionKeys,
  calificacionProcesoQuery,
  descargarActaEvaluacionHref,
  firmarActaEvaluacionMutation,
} from './data/calificacionData'

interface Calificacion {
  estado: string
  evaluador?: string
}

interface Proveedor {
  invitationId: string
  businessName: string
  cuit: string
  calificacion?: Calificacion | null
}

interface ProcesoData {
  id: string
  codigo: string
  titulo: string
  estado: string
  isEvaluationActSigned?: boolean
  evaluationActSignedByName?: string
  evaluationActSignedAtUtc?: string
  evaluationActHash?: string
  evaluationActSignature?: string
}

const CLASE_CALIFICACION = {
  pendiente: 'info' as const,
  aprobado: 'success' as const,
  observado: 'warning' as const,
  rechazado: 'error' as const,
}

const ETIQUETA_CALIFICACION: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  observado: 'Observado',
  rechazado: 'Rechazado',
}

export function CalificacionProcesoPage() {
  const { tenantId, usuario, rol } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const puedeCalificar = puedeCalificarProveedores(rol)
  const puedeFirmarActa = puedeFirmarActaEvaluacion(rol)

  const [mostrarFirmaModal, setMostrarFirmaModal] = useState(false)

  const procesoQuery = useQuery({
    queryKey: calificacionKeys.detail(tenantId, id),
    queryFn: () => calificacionProcesoQuery({ tenantId, procesoId: id }),
    enabled: Boolean(tenantId && id),
  })

  const firmarMutation = useMutation({
    mutationFn: firmarActaEvaluacionMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: calificacionKeys.detail(tenantId, id) })
      setMostrarFirmaModal(false)
    },
  })

  async function handleFirmarActa(signatureBase64: string) {
    if (!puedeFirmarActa) return

    try {
      await firmarMutation.mutateAsync({
        tenantId,
        procesoId: id,
        evaluatorId: usuario.id,
        signatureImage: signatureBase64,
      })
    } catch {
      // El error se muestra desde la mutation.
    }
  }

  if (procesoQuery.isLoading) return <LoadingState label="Cargando proceso..." />

  const data = procesoQuery.data as { proceso?: ProcesoData; proveedores?: Proveedor[] } | undefined
  const proceso = data?.proceso
  const proveedores = data?.proveedores ?? []
  const error = getErrorMessage(procesoQuery.error ?? firmarMutation.error, '')
  if (error && !proceso) return <Alert variant="error">{error}</Alert>
  if (!proceso) return <EmptyState icon={SearchX} title="No encontrado" description="Proceso no encontrado." />

  const pendientes = proveedores.filter(
    (s) => !s.calificacion || s.calificacion.estado === 'pendiente',
  ).length

  const proveedorColumns: Array<DataTableColumn<Proveedor & Record<string, unknown>>> = [
    { header: 'Proveedor', accessor: 'businessName', sortable: true },
    {
      header: 'CUIT',
      cell: (row) => <code>{row.cuit}</code>,
    },
    {
      header: 'Calificación',
      cell: (row) => {
        const est = row.calificacion?.estado
        return est ? (
          <Badge variant={CLASE_CALIFICACION[est] ?? 'info'}>
            {ETIQUETA_CALIFICACION[est] ?? 'Pendiente'}
          </Badge>
        ) : (
          <Badge variant="info">Pendiente</Badge>
        )
      },
    },
    {
      header: 'Evaluador',
      cell: (row) => <>{row.calificacion?.evaluador ?? '-'}</>,
    },
    {
      header: '',
      align: 'right',
      cell: (row) => (
        <Button size="sm" onClick={() => navigate(`/calificacion/${id}/${row.invitationId}`)}>
          {puedeCalificar && (!row.calificacion || row.calificacion.estado === 'pendiente')
            ? 'Calificar'
            : 'Ver'}
        </Button>
      ),
    },
  ]

  return (
    <PageShell width="wide">
      <PageHeader
        title={proceso.titulo}
        description={
          <>
            <code>{proceso.codigo}</code> &middot; {etiquetaEstado(proceso.estado)}
            &middot; {proveedores.length} proveedor(es) aceptaron
            {pendientes > 0 && (
              <span>
                {' '}&middot; <strong>{pendientes} pendiente(s)</strong>
              </span>
            )}
          </>
        }
        actions={
          <Button variant="ghost" onClick={() => navigate('/calificacion')}>
            &larr; Volver
          </Button>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {proveedores.length === 0 ? (
        <EmptyState icon={Users} title="Sin proveedores" description="No hay proveedores que hayan aceptado la invitación en este proceso." />
      ) : (
        <>
          <DataTable
            columns={proveedorColumns}
            rows={proveedores as (Proveedor & Record<string, unknown>)[]}
            getRowId={(row) => row.invitationId}
            emptyTitle="Sin proveedores"
            emptyDescription="No hay proveedores en este proceso."
          />

          <FormSection
            title={
              <span className="inline-flex items-center gap-2">
                <Shield size={18} /> Acta de Evaluación de Proveedores
              </span>
            }
          >
            {proceso.isEvaluationActSigned ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="success">Firmada e Inmutable</Badge>
                  <span className="text-sm text-text-muted">
                    Firmado por: <strong>{proceso.evaluationActSignedByName}</strong> el{' '}
                    {new Date(proceso.evaluationActSignedAtUtc!).toLocaleString()}
                  </span>
                </div>

                <div className="rounded-md border border-border bg-background p-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-text-muted">HASH SHA-256:</span>
                      <code className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-xs text-text">
                        {proceso.evaluationActHash}
                      </code>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-text-muted">FIRMA DIGITAL:</span>
                      <code className="break-all rounded bg-muted/50 px-1.5 py-0.5 font-mono text-xs text-text">
                        {proceso.evaluationActSignature}
                      </code>
                    </div>
                  </div>
                </div>

                <div>
                  <a
                    href={descargarActaEvaluacionHref({ tenantId, procesoId: id })}
                    download={`Acta-Evaluacion-${proceso.codigo}.pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-[14px] py-2 text-base font-medium text-white shadow-sm transition-all duration-150 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <Download size={16} />
                    <span>Descargar Acta (PDF)</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {pendientes > 0 ? (
                  <Alert variant="warning">
                    <AlertTriangle size={16} className="inline" /> Debe calificar a todos los
                    proveedores ({pendientes} pendiente(s)) antes de poder generar y firmar el acta.
                  </Alert>
                ) : (
                  <div>
                    <p className="mb-4 text-sm text-text-muted">
                      Todos los proveedores han sido calificados. Firme el acta de evaluación para
                      habilitar el inicio de la subasta inversa.
                    </p>
                    {puedeFirmarActa ? (
                      <Button
                        onClick={() => setMostrarFirmaModal(true)}
                        disabled={firmarMutation.isPending}
                        icon={<PenLine size={16} />}
                      >
                        Firmar y Habilitar Subasta
                      </Button>
                    ) : (
                      <Alert variant="info">El acta debe ser firmada por un comprador.</Alert>
                    )}
                  </div>
                )}
              </div>
            )}
          </FormSection>
        </>
      )}

      {mostrarFirmaModal && (
        <SignaturePad
          onConfirm={handleFirmarActa}
          onCancel={() => setMostrarFirmaModal(false)}
        />
      )}
    </PageShell>
  )
}
