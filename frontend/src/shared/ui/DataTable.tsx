import { ReactNode, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown, SearchX } from 'lucide-react'
import { Button } from './Button'
import { EmptyState } from './EmptyState'
import { Spinner } from './Spinner'

export interface DataTableColumn<T> {
  id?: string
  header: ReactNode
  accessor?: keyof T
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  width?: string
  cell?: (row: T) => ReactNode
  sortValue?: (row: T) => string | number | Date | null | undefined
}

export interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>
  rows: T[]
  getRowId?: (row: T, index: number) => string
  loading?: boolean
  error?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
  actions?: ReactNode
  pageSize?: number
  onRowClick?: (row: T) => void
  className?: string
}

type SortState = {
  columnId: string
  direction: 'asc' | 'desc'
} | null

const alignments = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  getRowId,
  loading = false,
  error,
  emptyTitle = 'Sin resultados',
  emptyDescription = 'No hay registros para mostrar.',
  actions,
  pageSize = 0,
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null)
  const [page, setPage] = useState(0)

  const preparedColumns = useMemo(
    () => columns.map((column, index) => ({ ...column, id: column.id ?? String(column.accessor ?? index) })),
    [columns]
  )

  const sortedRows = useMemo(() => {
    if (!sort) return rows

    const column = preparedColumns.find((item) => item.id === sort.columnId)
    if (!column) return rows

    return [...rows].sort((left, right) => {
      const leftValue = getSortValue(left, column)
      const rightValue = getSortValue(right, column)
      if (leftValue == null && rightValue == null) return 0
      if (leftValue == null) return 1
      if (rightValue == null) return -1

      const result = String(leftValue).localeCompare(String(rightValue), 'es', { numeric: true })
      return sort.direction === 'asc' ? result : -result
    })
  }, [preparedColumns, rows, sort])

  const pageCount = pageSize > 0 ? Math.ceil(sortedRows.length / pageSize) : 0
  const visibleRows = pageSize > 0
    ? sortedRows.slice(page * pageSize, (page + 1) * pageSize)
    : sortedRows

  function toggleSort(column: DataTableColumn<T> & { id: string }) {
    if (!column.sortable) return

    setPage(0)
    setSort((current) => {
      if (current?.columnId === column.id) {
        return { columnId: column.id, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }

      return { columnId: column.id, direction: 'asc' }
    })
  }

  if (error) {
    return (
      <div className="rounded-md border border-error/25 bg-error-bg px-4 py-3 text-sm text-error" role="alert">
        {error}
      </div>
    )
  }

  return (
    <div className={['overflow-hidden rounded-md border border-border bg-surface shadow-sm', className].filter(Boolean).join(' ')}>
      {actions && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">{actions}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              {preparedColumns.map((column) => {
                const activeSort = sort?.columnId === column.id ? sort.direction : null
                return (
                  <th
                    key={column.id}
                    scope="col"
                    style={column.width ? { width: column.width } : undefined}
                    className={[
                      'border-b border-border bg-background px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted',
                      alignments[column.align ?? 'left'],
                      column.sortable ? 'cursor-pointer select-none hover:text-text' : '',
                    ].join(' ')}
                    onClick={() => toggleSort(column)}
                    aria-sort={activeSort === 'asc' ? 'ascending' : activeSort === 'desc' ? 'descending' : undefined}
                  >
                    <span className={['inline-flex items-center gap-1', column.align === 'right' ? 'justify-end' : '', column.align === 'center' ? 'justify-center' : ''].join(' ')}>
                      {column.header}
                      {column.sortable && (
                        activeSort === 'asc' ? <ChevronUp size={14} /> : activeSort === 'desc' ? <ChevronDown size={14} /> : <ChevronsUpDown size={14} className="opacity-35" />
                      )}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={preparedColumns.length} className="px-4 py-12">
                  <div className="flex justify-center">
                    <Spinner />
                  </div>
                </td>
              </tr>
            ) : visibleRows.length === 0 ? (
              <tr>
                <td colSpan={preparedColumns.length} className="px-4 py-8">
                  <EmptyState icon={SearchX} title={emptyTitle} description={emptyDescription} action={undefined} />
                </td>
              </tr>
            ) : (
              visibleRows.map((row, rowIndex) => (
                <tr
                  key={getRowId?.(row, rowIndex) ?? String(row.id ?? rowIndex)}
                  className={[
                    'border-b border-border last:border-b-0 transition-colors hover:bg-background',
                    onRowClick ? 'cursor-pointer' : '',
                  ].join(' ')}
                  onClick={() => onRowClick?.(row)}
                >
                  {preparedColumns.map((column) => (
                    <td
                      key={column.id}
                      className={['px-4 py-3 text-sm text-text', alignments[column.align ?? 'left']].join(' ')}
                    >
                      {column.cell ? column.cell(row) : renderAccessor(row, column)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageSize > 0 && pageCount > 1 && (
        <div className="flex flex-col gap-3 border-t border-border bg-background px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-text-muted">
            {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sortedRows.length)} de {sortedRows.length}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
              Anterior
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage((value) => value + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function getSortValue<T extends Record<string, unknown>>(row: T, column: DataTableColumn<T>) {
  if (column.sortValue) return column.sortValue(row)
  if (column.accessor) return row[column.accessor]
  return null
}

function renderAccessor<T extends Record<string, unknown>>(row: T, column: DataTableColumn<T>) {
  if (!column.accessor) return null
  const value = row[column.accessor]
  return value == null || value === '' ? '-' : String(value)
}
