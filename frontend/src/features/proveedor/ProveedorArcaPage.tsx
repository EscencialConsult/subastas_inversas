import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, RefreshCw, ShieldCheck, Timer, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../context/ToastContext'
import type { ArcaAuditEntryMapped } from '../../shared/api/proveedoresApi'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { EmptyState } from '../../shared/ui/EmptyState'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { Spinner } from '../../shared/ui/Spinner'
import {
  proveedorHomeQuery,
  proveedoresKeys,
  listarHistorialArcaProveedorQuery,
  reintentarVerificacionArcaProveedorMutation,
} from './data/proveedoresData'

const ESTADO_ARCA_BADGE: Record<string, { texto: string; variant: 'success' | 'warning' | 'error' | 'neutral' }> = {
  verificado: { texto: 'Verificado', variant: 'success' },
  pendiente: { texto: 'Pendiente', variant: 'warning' },
  rechazado: { texto: 'Rechazado', variant: 'error' },
  fallido: { texto: 'Fallido', variant: 'error' },
  revision_manual: { texto: 'Revision manual', variant: 'warning' },
  pendiente_revision: { texto: 'Pendiente de revision', variant: 'warning' },
}

function scoreBadge(score: number | null | undefined): { texto: string; variant: 'success' | 'warning' | 'error' | 'neutral' } {
  if (score == null) return { texto: 'Sin dato', variant: 'neutral' }
  if (score >= 85) return { texto: `${score}% - Coincide`, variant: 'success' }
  if (score >= 70) return { texto: `${score}% - Coincidencia parcial`, variant: 'warning' }
  return { texto: `${score}% - No coincide`, variant: 'error' }
}

export function ProveedorArcaPage() {
  const { usuario } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()

  const homeQuery = useQuery({
    queryKey: proveedoresKeys.byUser(usuario.id),
    queryFn: () => proveedorHomeQuery({ usuarioId: usuario.id }),
    enabled: Boolean(usuario.id),
  })

  const proveedor = homeQuery.data?.proveedor

  const historialQuery = useQuery({
    queryKey: proveedoresKeys.arcaHistory(proveedor?.id),
    queryFn: () => listarHistorialArcaProveedorQuery({ proveedorId: proveedor?.id ?? '' }),
    enabled: Boolean(proveedor?.id),
  })

  const reintentarMutation = useMutation({
    mutationFn: (params: { proveedorId: string }) => reintentarVerificacionArcaProveedorMutation(params),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: proveedoresKeys.lists() })
      toast.success('Verificacion ARCA reenviada. El proceso puede demorar unos segundos.')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (homeQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  const error = getErrorMessage(homeQuery.error, '')
  if (error || !proveedor) return <Alert variant="error">{error || 'No se encontro el proveedor.'}</Alert>

  const estadoBadge = ESTADO_ARCA_BADGE[proveedor.estadoArca] ?? ESTADO_ARCA_BADGE.pendiente

  return (
    <PageShell as="section" width="wide" className="px-0 py-0">
      <PageHeader
        title="Verificacion ARCA"
        description="Estado fiscal, coincidencia de razon social e historial de verificaciones con ARCA."
        meta={<Badge variant={estadoBadge.variant}>{estadoBadge.texto}</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card hover={false} padding="md" className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text">
            <Building2 size={18} />
            Datos declarados
          </div>
          <ResumenGrid
            items={[
              ['Razon social', proveedor.razonSocial],
              ['CUIT', proveedor.cuit],
              ['Rubro', proveedor.rubro],
              ['Provincia', proveedor.provincia],
              ['Localidad', proveedor.localidad],
            ]}
          />
        </Card>

        <Card hover={false} padding="md" className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text">
            <ShieldCheck size={18} />
            Datos ARCA
          </div>
          <ResumenGrid
            items={[
              ['Razon social ARCA', proveedor.arcaRazonSocial || '---'],
              ['Condicion IVA', proveedor.arcaCondicionIva || '---'],
              ['Domicilio fiscal', proveedor.arcaDomicilioFiscal || '---'],
              ['Verificado el', proveedor.verificadoArcaEn ? formatearFechaHora(proveedor.verificadoArcaEn) : '---'],
              ['Vence el', proveedor.arcaVenceEl ? formatearFechaHora(proveedor.arcaVenceEl) : '---'],
            ]}
          />
        </Card>

        <Card hover={false} padding="md" className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text">
            <Timer size={18} />
            Coincidencia de razon social
          </div>
          {proveedor.arcaMatchScore != null ? (
            <div className="space-y-2">
              <Badge variant={scoreBadge(proveedor.arcaMatchScore).variant}>
                {scoreBadge(proveedor.arcaMatchScore).texto}
              </Badge>
              <p className="m-0 text-sm text-text-muted">
                La razon social declarada ({proveedor.razonSocial}) se comparo con la registrada en ARCA ({proveedor.arcaRazonSocial || 'N/A'}).
                {proveedor.estadoArca === 'revision_manual' && ' Como no coincide exactamente, tu registro paso a revision manual.'}
              </p>
            </div>
          ) : (
            <Alert variant="info">Todavia no se realizo la verificacion de coincidencia de razon social.</Alert>
          )}
        </Card>

        <Card hover={false} padding="md" className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text">
            <AlertTriangle size={18} />
            Notas
          </div>
          {proveedor.notasArca ? (
            <p className="m-0 whitespace-pre-wrap text-sm leading-6 text-text-muted">{proveedor.notasArca}</p>
          ) : (
            <Alert variant="info">Sin observaciones registradas.</Alert>
          )}
        </Card>
      </div>

      <Card hover={false} padding="md" className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-text">
          <RefreshCw size={18} />
          Re-verificar
        </div>
        <p className="m-0 text-sm text-text-muted">
          Si corregiste datos o pasaron varios dias, podes solicitar una nueva verificacion ARCA.
        </p>
        {proveedor.id ? (
          <Button
            type="button"
            onClick={() => reintentarMutation.mutate({ proveedorId: proveedor.id })}
            loading={reintentarMutation.isPending}
          >
            Solicitar nueva verificacion
          </Button>
        ) : (
          <p className="text-sm text-text-muted">Identificador de proveedor no disponible.</p>
        )}
      </Card>

      <Card hover={false} padding="md" className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-text">
          <ShieldCheck size={18} />
          Historial de verificaciones
        </div>

        {historialQuery.isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : historialQuery.data?.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Sin historial" description="Todavia no hay verificaciones ARCA registradas." />
        ) : (
          <div className="space-y-3">
            {(historialQuery.data ?? []).map((entry) => (
              <ArcaTimelineEntry key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </Card>
    </PageShell>
  )
}

function ArcaTimelineEntry({ entry }: { entry: ArcaAuditEntryMapped }) {
  const badge = ESTADO_ARCA_BADGE[entry.result] ?? ESTADO_ARCA_BADGE.pendiente
  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={badge.variant}>{badge.texto}</Badge>
          <span className="text-xs font-medium text-text-muted">{entry.source}</span>
          {entry.automatic && <span className="text-xs text-text-muted">· Automatico</span>}
        </div>
        <span className="text-xs text-text-muted">{formatearFechaHora(entry.createdAtUtc)}</span>
      </div>
      <p className="mb-0 mt-2 text-sm text-text-muted">{entry.notes}</p>
      {entry.businessNameMatchScore !== null && (
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-text-muted">Coincidencia:</span>
          <Badge variant={scoreBadge(entry.businessNameMatchScore).variant}>
            {scoreBadge(entry.businessNameMatchScore).texto}
          </Badge>
        </div>
      )}
      {entry.businessNameDeclared && entry.businessNameFoundInArca && (
        <div className="mt-1 text-xs text-text-muted">
          Declarado: {entry.businessNameDeclared} | ARCA: {entry.businessNameFoundInArca}
        </div>
      )}
    </div>
  )
}

function ResumenGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</dt>
          <dd className="m-0 mt-1 text-sm text-text">{value || '---'}</dd>
        </div>
      ))}
    </dl>
  )
}

function formatearFechaHora(fechaIso?: string | null) {
  if (!fechaIso) return '---'
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(fechaIso))
}
