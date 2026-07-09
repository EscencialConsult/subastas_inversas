import { Badge } from '../../../shared/ui/Badge'
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable'
import { Pagination, usePagination } from '../../../shared/ui/Pagination'
import type { SupplierEval } from './auditoriaDetailTypes'

export function EvaluacionSection({ evalResults }: { evalResults: { criteria?: Array<{ type?: string; name?: string; weight?: number }>; supplierEvaluations?: SupplierEval[] } | null }) {
  const supplierEvals = (evalResults?.supplierEvaluations ?? []) as (SupplierEval & Record<string, unknown>)[]
  const { paginatedItems, setPage, setPageSize, ...paginacion } = usePagination(supplierEvals)

  if (!evalResults?.supplierEvaluations?.length) return <p className="text-sm text-text-muted">Sin datos de evaluación.</p>

  const exclusionaryCriteria = evalResults.criteria?.filter((c) => c.type === 'Exclusionary') ?? []
  const weightedCriteria = evalResults.criteria?.filter((c) => c.type === 'Weighted') ?? []

  const columns: Array<DataTableColumn<SupplierEval & Record<string, unknown>>> = [
    { header: 'Proveedor', accessor: 'supplierName' },
    {
      header: 'Score',
      cell: (row) => (row.isExcluded ? '---' : `${row.totalWeightedScore ?? 0}%`),
    },
    {
      header: 'Excluido',
      cell: (row) =>
        row.isExcluded ? (
          <Badge variant="error" className="cursor-help" title={row.excludedReason ?? ''}>
            Sí
          </Badge>
        ) : (
          <Badge variant="success">No</Badge>
        ),
    },
  ]

  return (
    <div className="space-y-3">
      {evalResults.criteria && evalResults.criteria.length > 0 && (
        <div className="text-sm text-text-muted">
          {exclusionaryCriteria.length > 0 && (
            <span>
              Excluyentes: {exclusionaryCriteria.map((c) => c.name).join(', ')}
            </span>
          )}
          {weightedCriteria.length > 0 && (
            <span className={exclusionaryCriteria.length > 0 ? 'ml-4' : ''}>
              Ponderados: {weightedCriteria.map((c) => `${c.name} (${c.weight}%)`).join(', ')}
            </span>
          )}
        </div>
      )}
      <DataTable
        columns={columns}
        rows={paginatedItems}
        getRowId={(row) => row.id ?? String(Math.random())}
      />
      <Pagination {...paginacion} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  )
}
