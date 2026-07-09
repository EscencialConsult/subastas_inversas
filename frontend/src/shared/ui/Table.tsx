import { useMemo, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown, SearchX } from 'lucide-react'
import { EmptyState } from './EmptyState'
import { Spinner } from './Spinner'

export interface TableColumn<T extends Record<string, unknown>> {
  header: ReactNode
  accessor: keyof T | string
  render?: (value: unknown, row: T) => ReactNode
  sortKey?: keyof T | string | boolean
}

interface TableProps<T extends Record<string, unknown>> {
  columns?: TableColumn<T>[]
  data?: T[]
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: ReactNode
  emptyIcon?: ComponentType<{ size?: number | string; className?: string }>
  emptyAction?: ReactNode
  sortable?: boolean
  pageSize?: number
  onRowClick?: (row: T) => void
  className?: string
}

type SortState = { key: string | null; dir: 'asc' | 'desc' }

export function Table<T extends Record<string, unknown>>({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = 'Sin datos',
  emptyDescription = 'No hay registros para mostrar.',
  emptyIcon = SearchX,
  emptyAction,
  sortable = true,
  pageSize = 0,
  onRowClick,
  className = '',
}: TableProps<T>) {
  const [sort, setSort] = useState<SortState>({ key: null, dir: 'asc' })
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    if (!sort.key) return data
    return [...data].sort((a, b) => {
      const aVal = a[sort.key as keyof T]
      const bVal = b[sort.key as keyof T]
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = String(aVal).localeCompare(String(bVal), 'es', { numeric: true })
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [data, sort])

  const paginated = useMemo(() => {
    if (!pageSize) return sorted
    return sorted.slice(page * pageSize, (page + 1) * pageSize)
  }, [sorted, page, pageSize])

  const totalPages = pageSize ? Math.ceil(sorted.length / pageSize) : 0

  function toggleSort(key: string) {
    setSort((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      return { key, dir: 'asc' }
    })
  }

  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i} scope="col" className="border-b border-border bg-background px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    )
  }

  return (
    <div className={`overflow-hidden rounded-lg border border-border bg-surface shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((col, i) => {
                const accessor = String(col.accessor)
                const canSort = sortable && col.sortKey !== false
                return (
                  <th
                    key={i}
                    scope="col"
                    className={[
                      'border-b border-border bg-background px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted',
                      canSort ? 'cursor-pointer select-none hover:text-text' : '',
                    ].join(' ')}
                    onClick={() => canSort && toggleSort(accessor)}
                    aria-sort={canSort && sort.key === accessor ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {canSort && (
                        sort.key === accessor ? (
                          sort.dir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : (
                          <ChevronsUpDown size={14} className="opacity-30" />
                        )
                      )}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row, rowIndex) => (
              <tr
                key={String(row.id ?? rowIndex)}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-border transition-colors last:border-b-0 hover:bg-background ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col, colIndex) => {
                  const accessor = String(col.accessor)
                  const value = row[accessor as keyof T]
                  return (
                    <td key={colIndex} className="border-b border-border px-4 py-3 text-sm text-text last:border-b-0">
                      {col.render ? col.render(value, row) : String(value ?? '---')}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageSize > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border bg-background px-4 py-3 text-sm">
          <span className="text-text-muted">
            {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sorted.length)} de {sorted.length}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="rounded border border-border bg-surface px-3 py-1 text-sm transition-colors hover:bg-background disabled:cursor-default disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="rounded border border-border bg-surface px-3 py-1 text-sm transition-colors hover:bg-background disabled:cursor-default disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
