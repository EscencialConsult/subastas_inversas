// Monitor de subasta para el comprador.

import { useNavigate, useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { useAuth } from '../../../auth/AuthContext'
import { mejorOferta, type SubastaMapped } from '../../../shared/api/subastasApi'
import { Alert } from '../../../shared/ui/Alert'
import { Button } from '../../../shared/ui/Button'
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable'
import { FormSection } from '../../../shared/ui/FormSection'
import { LoadingState } from '../../../shared/ui/StateViews'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PageShell } from '../../../shared/ui/PageShell'
import { StatusBadge } from '../../../shared/ui/StatusBadge'
import { useSubasta } from '../hooks/useSubasta'

const ESTADO_SUBASTA = {
  Scheduled: { texto: 'Programada', variant: 'warning' },
  Open: { texto: 'Abierta', variant: 'success' },
  Closed: { texto: 'Cerrada', variant: 'neutral' },
} as const

type EstadoSubastaKey = keyof typeof ESTADO_SUBASTA
type LanceRow = SubastaMapped['lances'][number] & Record<string, unknown>
type ComparativoRow = SubastaMapped['cuadroComparativo'][number] & Record<string, unknown>

export function SubastaPage() {
  const { procesoId } = useParams()
  const { tenantId } = useAuth()
  const navigate = useNavigate()
  const {
    proceso,
    subasta,
    cargando,
    error,
    setError,
    restante,
    ahoraMs,
    simularNuevoLance,
    cerrar: cerrarSubastaActual,
  } = useSubasta({ tenantId, procesoId })

  async function nuevoLance() {
    try {
      await simularNuevoLance()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function cerrar() {
    setError('')
    try {
      await cerrarSubastaActual()
      navigate('/compras')
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  if (cargando) return <LoadingState label="Cargando subasta..." />

  if (!subasta || !proceso) {
    return (
      <PageShell>
        <Alert variant="error">{error || 'No se pudo cargar la subasta.'}</Alert>
      </PageShell>
    )
  }

  const inicio = new Date(subasta.inicioISO).getTime()
  const programada = subasta.estado === 'Scheduled' || ahoraMs < inicio
  const abierta = subasta.estado === 'Open' && !programada
  const cerrada = subasta.estado === 'Closed' || (!programada && restante !== null && restante <= 0)
  const estadoKey: EstadoSubastaKey = cerrada ? 'Closed' : programada ? 'Scheduled' : 'Open'
  const estado = ESTADO_SUBASTA[estadoKey]
  const mejor = mejorOferta(subasta)
  const lancesOrdenados = [...subasta.lances].reverse()

  return (
    <PageShell width="wide">
      <PageHeader
        title={<>Subasta <code>{proceso.codigo}</code></>}
        description={proceso.titulo}
        actions={(
          <Button variant="ghost" onClick={() => navigate('/compras')}>
            Volver
          </Button>
        )}
      />

      <Alert variant="info">La apertura y el cierre se ejecutan automaticamente por el servidor.</Alert>
      {error && <Alert variant="error">{error}</Alert>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Estado">
          <StatusBadge status={estadoKey} label={estado.texto} variant={estado.variant} />
        </MetricCard>
        <MetricCard label="Mejor oferta actual" value={formatearPesos(mejor)} featured />
        <MetricCard label="Precio base" value={formatearPesos(subasta.precioBase)} />
        <MetricCard label={programada ? 'Inicia en' : 'Tiempo restante'} value={cerrada ? 'Finalizada' : formatearTiempo(restante)} />
      </section>

      <FormSection title="Parametros de subasta">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-5">
          <Param label="Decremento requerido" value={`${subasta.decrementoMinimo}%`} />
          <Param label="Extension de ultimo minuto" value={`${subasta.autoExtensionMinutes} min`} />
          {subasta.pabThreshold > 0 && <Param label="Umbral PAB" value={formatearPesos(subasta.pabThreshold)} tone="danger" />}
          <Param label="Inicio" value={new Date(subasta.inicioISO).toLocaleString()} />
          {subasta.actaCierreHash && <Param label="Hash acta cierre" value={`${subasta.actaCierreHash.slice(0, 12)}...`} title={subasta.actaCierreHash} mono />}
        </dl>
      </FormSection>

      {cerrada && <ComparativoSection subasta={subasta} />}

      <FormSection
        title={`Lances (${subasta.lances.length})`}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            {abierta && !cerrada && (
              <Button variant="secondary" onClick={nuevoLance}>
                Simular lance de proveedor
              </Button>
            )}
            {abierta && !cerrada && (
              <Button onClick={cerrar}>
                Cerrar subasta y enviar a evaluacion
              </Button>
            )}
            {programada && <span className="text-sm text-text-muted">La subasta se abrira automaticamente.</span>}
          </div>
        )}
      >
        <LancesTable lances={lancesOrdenados} />
      </FormSection>
    </PageShell>
  )
}

function ComparativoSection({ subasta }: { subasta: SubastaMapped }) {
  const columns: Array<DataTableColumn<ComparativoRow>> = [
    { header: '#', accessor: 'posicion', width: '80px' },
    { header: 'Proveedor', accessor: 'proveedor' },
    {
      header: 'Mejor oferta',
      sortValue: (row) => row.mejorMonto,
      cell: (row) => formatearPesos(row.mejorMonto),
    },
    { header: 'Lances', accessor: 'cantidadLances' },
    {
      header: 'Ahorro',
      cell: (row) => `${formatearPesos(row.ahorroMonto)} (${Number(row.ahorroPorcentaje ?? 0).toFixed(2)}%)`,
    },
  ]

  return (
    <FormSection
      title="Acta de cierre y cuadro comparativo"
      description={`Ahorro obtenido: ${formatearPesos(subasta.ahorroMonto)} (${Number(subasta.ahorroPorcentaje ?? 0).toFixed(2)}%)`}
      actions={subasta.actaCierreUrl ? (
        <Button as="a" href={subasta.actaCierreUrl} target="_blank" rel="noreferrer" icon={<Download size={16} />}>
          Descargar acta
        </Button>
      ) : null}
    >
      <DataTable
        columns={columns}
        rows={(subasta.cuadroComparativo ?? []) as ComparativoRow[]}
        getRowId={(row) => row.proveedorId}
        emptyTitle="Sin lances"
        emptyDescription="No se registraron lances para comparar."
      />
    </FormSection>
  )
}

function LancesTable({ lances }: { lances: SubastaMapped['lances'] }) {
  const columns: Array<DataTableColumn<LanceRow>> = [
    {
      header: 'Proveedor',
      accessor: 'proveedor',
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{row.proveedor}</span>
          {row.isPab && <StatusBadge status="pab" label="PAB" variant="error" />}
        </div>
      ),
    },
    {
      header: 'Monto',
      sortValue: (row) => row.monto,
      cell: (row) => <span className={row.isPab ? 'font-semibold text-error' : ''}>{formatearPesos(row.monto)}</span>,
    },
    { header: 'Cuando', accessor: 'hace' },
  ]

  return (
    <DataTable
      columns={columns}
      rows={lances as LanceRow[]}
      getRowId={(row) => row.id}
      emptyTitle="Sin lances"
      emptyDescription="Todavia no hay lances registrados."
    />
  )
}

function MetricCard({
  label,
  value,
  featured = false,
  children,
}: {
  label: string
  value?: string
  featured?: boolean
  children?: React.ReactNode
}) {
  return (
    <article className="rounded-md border border-border bg-surface px-4 py-4 shadow-sm">
      <span className="text-sm font-medium text-text-muted">{label}</span>
      <div className={['mt-2 text-xl font-semibold', featured ? 'text-primary' : 'text-text'].join(' ')}>
        {children ?? value}
      </div>
    </article>
  )
}

function Param({
  label,
  value,
  tone = 'default',
  title,
  mono = false,
}: {
  label: string
  value: string
  tone?: 'default' | 'danger'
  title?: string
  mono?: boolean
}) {
  return (
    <div>
      <dt className="font-medium text-text-muted">{label}</dt>
      <dd className={['mt-1 font-semibold', tone === 'danger' ? 'text-error' : 'text-text', mono ? 'font-mono' : ''].join(' ')} title={title}>
        {value}
      </dd>
    </div>
  )
}

function formatearPesos(monto: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}

function formatearTiempo(ms: number | null) {
  const total = Math.max(0, Math.floor((ms ?? 0) / 1000))
  const min = String(Math.floor(total / 60)).padStart(2, '0')
  const seg = String(total % 60).padStart(2, '0')
  return `${min}:${seg}`
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Ocurrio un error inesperado.'
}
