import { analisisSubasta } from '../../../shared/api/subastasApi'
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable'
import { Pagination, usePagination } from '../../../shared/ui/Pagination'
import type { SubastaAudit } from './auditoriaDetailTypes'

function formatearPesos(monto: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}

function InfoTerm({ label, value, fullWidth = false }: { label: string; value: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <dt className="text-xs font-semibold uppercase text-text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-text">{value ?? '---'}</dd>
    </div>
  )
}

function LancesSubTable({ lances }: { lances: NonNullable<SubastaAudit['lances']> }) {
  const lancesSorted = [...lances].sort((left, right) => (left.monto ?? 0) - (right.monto ?? 0))
  const { paginatedItems, setPage, setPageSize, ...paginacion } = usePagination(lancesSorted as (NonNullable<SubastaAudit['lances']>[number] & Record<string, unknown>)[])

  const columns: Array<DataTableColumn<NonNullable<SubastaAudit['lances']>[number] & Record<string, unknown>>> = [
    { header: 'Proveedor', accessor: 'proveedor' },
    {
      header: 'Monto',
      sortValue: (row) => row.monto ?? 0,
      cell: (row) => formatearPesos(row.monto ?? 0),
    },
  ]

  return (
    <div>
      <h3 className="mb-3 text-base font-semibold text-text">Lances ({lances.length})</h3>
      <DataTable
        columns={columns}
        rows={paginatedItems}
        getRowId={(row) => row.id ?? String(Math.random())}
      />
      <Pagination {...paginacion} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  )
}

export function SubastaSection({ subasta }: { subasta: SubastaAudit | null | undefined }) {
  if (!subasta) return null
  const a = analisisSubasta(subasta as Parameters<typeof analisisSubasta>[0])

  return (
    <div className="space-y-3">
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <InfoTerm label="Proveedores que ofertaron" value={a.oferentes} />
        <InfoTerm label="Lances totales" value={a.cantidadLances} />
        <InfoTerm label="Presupuesto base" value={formatearPesos(a.base)} />
        <InfoTerm label="Mejor oferta" value={formatearPesos(a.mejor)} />
        <InfoTerm
          label="Baja lograda"
          value={`${a.bajaPorcentaje.toFixed(1)}% (${a.nivelBaja === 'alta' ? 'baja alta' : a.nivelBaja === 'moderada' ? 'baja moderada' : 'baja chica'})`}
        />
      </dl>

      {subasta.lances && subasta.lances.length > 0 && <LancesSubTable lances={subasta.lances} />}
    </div>
  )
}
