import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CircleAlert, FileCheck2, FileClock, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import type { DocumentoProveedorMapped, ProveedorMapped } from '../../shared/api/proveedoresApi'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Card, CardGrid } from '../../shared/ui/Card'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { Spinner } from '../../shared/ui/Spinner'
import {
  proveedorHomeQuery,
  proveedoresKeys,
} from './data/proveedoresData'

const ESTADO = {
  pendiente: { texto: 'Pendiente de verificacion', variant: 'warning' as const },
  verificado: { texto: 'Verificado', variant: 'success' as const },
  rechazado: { texto: 'Rechazado', variant: 'error' as const },
}

const READINESS = {
  listo: { texto: 'Listo para operar', variant: 'success' as const },
  requiere_revision: { texto: 'Requiere revision', variant: 'warning' as const },
  bloqueado: { texto: 'Bloqueado', variant: 'error' as const },
}

export function ProveedorHomePage() {
  const { usuario } = useAuth()

  const homeQuery = useQuery({
    queryKey: proveedoresKeys.byUser(usuario.id),
    queryFn: () => proveedorHomeQuery({ usuarioId: usuario.id }),
    enabled: Boolean(usuario.id),
  })

  const proveedor = homeQuery.data?.proveedor
  const documentos = useMemo(() => homeQuery.data?.documentos ?? [], [homeQuery.data?.documentos])

  if (homeQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  const error = getErrorMessage(homeQuery.error, '')
  if (error || !proveedor) return <Alert variant="error">{error || 'No se encontro el proveedor.'}</Alert>

  const estado = ESTADO[proveedor.estado] ?? ESTADO.pendiente
  const readiness = READINESS[proveedor.readinessStatus] ?? READINESS.requiere_revision
  const checklist = construirChecklist(proveedor, documentos)

  return (
    <PageShell as="section" width="wide" className="px-0 py-0">
      <PageHeader
        title="Mi cuenta de proveedor"
        description="Resumen de tu cuenta de proveedor: verificacion fiscal, estado documental y checklist de habilitacion."
        meta={
          <>
            <Badge variant={estado.variant}>{estado.texto}</Badge>
            <Badge variant={readiness.variant}>{readiness.texto}</Badge>
          </>
        }
      />

      <Card hover={false} padding="md" className="space-y-4">
        <ResumenGrid
          items={[
            ['Razon social', proveedor.razonSocial],
            ['CUIT', proveedor.cuit],
            ['Email', usuario.email],
            ['Rubro', proveedor.rubro],
            ['ARCA', proveedor.arcaVerificado ? 'Verificado' : 'Pendiente'],
            ['Ultima revision empresa', formatearFechaHora(proveedor.ultimaRevisionEmpresaEn)],
          ]}
        />

        <Alert variant={proveedor.readinessStatus === 'bloqueado' ? 'error' : proveedor.readinessStatus === 'listo' ? 'success' : 'warning'}>
          {mensajeEstadoProveedor(proveedor)}
        </Alert>
      </Card>

      <Card hover={false} padding="md" className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-text">
          <ShieldCheck size={18} />
          Checklist de habilitacion
        </div>
        <div className="space-y-2">
          {checklist.map((item) => (
            <div key={item.label} className="flex items-start gap-3 rounded-md border border-border p-3">
              <Badge variant={item.ok ? 'success' : item.variant}>{item.ok ? 'OK' : item.badge}</Badge>
              <div>
                <div className="text-sm font-medium text-text">{item.label}</div>
                <div className="text-sm text-text-muted">{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <CardGrid>
        <MetricCard icon={FileCheck2} label="Aprobados" value={`${proveedor.documentosAprobados}/${proveedor.documentosTotal}`} />
        <MetricCard icon={FileClock} label="Pendientes" value={String(proveedor.documentosPendientesRevision)} />
        <MetricCard icon={CircleAlert} label="Rechazados" value={String(proveedor.documentosRechazados)} />
        <MetricCard icon={CircleAlert} label="Vencidos" value={String(proveedor.documentosVencidos)} />
      </CardGrid>


    </PageShell>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileCheck2
  label: string
  value: string
}) {
  return (
    <Card hover={false} padding="sm" className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
        <Icon size={16} />
        {label}
      </div>
      <div className="text-2xl font-semibold text-text">{value}</div>
    </Card>
  )
}

function ResumenGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</dt>
          <dd className="m-0 mt-1 text-sm text-text">{value || '---'}</dd>
        </div>
      ))}
    </dl>
  )
}

function construirChecklist(proveedor: ProveedorMapped, documentos: DocumentoProveedorMapped[]) {
  const tieneConstancia = documentos.some((documento) => documento.tipoNombre === 'Constancia CUIT/CUIL')
  return [
    {
      label: 'Verificacion ARCA',
      detail: proveedor.arcaVerificado ? 'Tus datos fiscales ya fueron verificados.' : 'Todavia estamos validando tu situacion fiscal en ARCA.',
      ok: proveedor.arcaVerificado,
      badge: 'Pendiente',
      variant: 'warning' as const,
    },
    {
      label: 'Constancia CUIT/CUIL',
      detail: tieneConstancia ? 'Hay al menos una constancia cargada para revision.' : 'Todavia no cargaste la constancia CUIT/CUIL.',
      ok: tieneConstancia,
      badge: 'Falta',
      variant: 'error' as const,
    },
    {
      label: 'Documentacion con dictamen',
      detail: proveedor.documentosPendientesRevision === 0
        ? 'Todos los documentos cargados tienen dictamen.'
        : `Quedan ${proveedor.documentosPendientesRevision} documento(s) pendientes de revision.`,
      ok: proveedor.documentosPendientesRevision === 0 && proveedor.documentosTotal > 0,
      badge: 'Revision',
      variant: 'warning' as const,
    },
    {
      label: 'Documentacion vigente',
      detail: proveedor.documentosVencidos === 0
        ? 'No se detectan documentos vencidos.'
        : `Tenes ${proveedor.documentosVencidos} documento(s) vencidos o bloqueantes.`,
      ok: proveedor.documentosVencidos === 0,
      badge: 'Vencido',
      variant: 'error' as const,
    },
  ]
}

function mensajeEstadoProveedor(proveedor: ProveedorMapped) {
  if (proveedor.readinessStatus === 'bloqueado') {
    return 'Tu cuenta todavia no puede operar. Revisa los documentos vencidos, rechazados o la verificacion ARCA pendiente.'
  }
  if (proveedor.readinessStatus === 'requiere_revision') {
    return 'Tu cuenta ya esta avanzada, pero todavia quedan documentos o validaciones por revisar antes de habilitarla.'
  }
  return 'Tu cuenta esta alineada para operar. Si una empresa todavia no te habilito, ya cuenta con la informacion necesaria para hacerlo.'
}

function formatearFechaHora(fechaIso?: string | null) {
  if (!fechaIso) return '---'
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(String(fechaIso)))
}
