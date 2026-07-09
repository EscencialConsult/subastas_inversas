import type { FormEvent } from 'react'
import { Activity, Clock, TrendingDown } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { ConnectionStatus } from '../../../shared/ui/ConnectionStatus'
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable'
import { FormSection } from '../../../shared/ui/FormSection'
import { Input } from '../../../shared/ui/Input'
import { Pagination, usePagination } from '../../../shared/ui/Pagination'
import { StatusBadge } from '../../../shared/ui/StatusBadge'
import type { LanceMapped } from '../../../shared/api/proveedoresApi'

interface SubastaLiveMetricsProps {
  conexion: string
  abierta: boolean
  estado: string
  mejorOferta: number
  minimoPermitido: number
  precioAnterior: number
}

interface LanceFormProps {
  abierta: boolean
  ofertando: boolean
  monto: string
  esPab: boolean
  onMontoChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

type LanceRow = LanceMapped & Record<string, unknown>

export function SubastaLiveMetrics({
  conexion,
  abierta,
  estado,
  mejorOferta,
  minimoPermitido,
  precioAnterior,
}: SubastaLiveMetricsProps) {
  const precioBajo = mejorOferta < precioAnterior

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <ConnectionStatus status={conexion} />
      <MetricCard icon={Activity} label="Estado" value={abierta ? 'Abierta' : etiquetaEstado(estado)} />
      <MetricCard icon={TrendingDown} label="Mejor oferta" value={formatearPesos(mejorOferta)} featured={precioBajo} />
      <MetricCard icon={Clock} label="Minimo valido" value={formatearPesos(minimoPermitido)} />
    </div>
  )
}

export function LanceForm({
  abierta,
  ofertando,
  monto,
  esPab,
  onMontoChange,
  onSubmit,
}: LanceFormProps) {
  return (
    <FormSection
      title="Nuevo lance"
      description="El timestamp, la secuencia y los hashes se asignan en el servidor."
      actions={(
        <StatusBadge
          status={esPab ? 'pab' : 'ok'}
          variant={esPab ? 'error' : 'success'}
          label={esPab ? 'Oferta PAB' : 'Sin marca PAB'}
        />
      )}
    >
      <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]" onSubmit={onSubmit}>
        <Input
          type="number"
          min="0"
          step="0.01"
          label="Monto"
          value={monto}
          onChange={(event) => onMontoChange(event.target.value)}
          disabled={!abierta || ofertando}
          placeholder="Monto ofertado"
          fieldClassName="mb-0"
        />
        <div className="flex items-end">
          <Button type="submit" loading={ofertando} disabled={!abierta || ofertando}>
            Registrar lance
          </Button>
        </div>
      </form>
    </FormSection>
  )
}

export function LancesTable({ lances }: { lances: LanceMapped[] }) {
  const { paginatedItems, setPage, setPageSize, ...paginacion } = usePagination(lances as LanceRow[])

  const columns: Array<DataTableColumn<LanceRow>> = [
    {
      header: '#',
      accessor: 'secuencia',
      width: '80px',
      sortable: true,
    },
    {
      header: 'Proveedor',
      accessor: 'proveedor',
    },
    {
      header: 'Monto',
      sortable: true,
      sortValue: (row) => row.monto,
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{formatearPesos(row.monto)}</span>
          {row.isPab && <StatusBadge status="pab" label="PAB" variant="error" />}
          {row.subastaExtendida && <StatusBadge status="extendida" label="Extendida" variant="warning" />}
        </div>
      ),
    },
    {
      header: 'Servidor',
      accessor: 'fechaServidor',
      cell: (row) => formatearFecha(row.fechaServidor),
    },
    {
      header: 'Hash',
      accessor: 'hash',
      cell: (row) => <code title={row.hash}>{row.hash ? row.hash.slice(0, 12) : '---'}</code>,
    },
  ]

  return (
    <FormSection title="Lances" description="Historial ordenado por secuencia de servidor.">
      <DataTable
        columns={columns}
        rows={paginatedItems}
        getRowId={(row) => row.id}
        emptyTitle="Sin lances"
        emptyDescription="Todavia no hay lances registrados."
      />
      <Pagination {...paginacion} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </FormSection>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  featured = false,
}: {
  icon: typeof Activity
  label: string
  value: string
  featured?: boolean
}) {
  return (
    <article className={`rounded-md border px-4 py-4 shadow-sm transition-colors duration-300 ${featured ? 'animate-pulse border-warning bg-warning-bg' : 'border-border bg-surface'}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-text-muted">
        <Icon size={16} />
        <span>{label}</span>
      </div>
      <p className={`mt-2 text-xl font-semibold ${featured ? 'text-error' : 'text-text'}`}>
        {value}
      </p>
    </article>
  )
}

function etiquetaEstado(estado: string) {
  if (estado === 'Scheduled') return 'Programada'
  if (estado === 'Open') return 'Abierta'
  if (estado === 'Closed') return 'Cerrada'
  return estado
}

function formatearPesos(monto: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(monto ?? 0))
}

function formatearFecha(fechaIso?: string | null) {
  if (!fechaIso) return '---'
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(fechaIso))
}
