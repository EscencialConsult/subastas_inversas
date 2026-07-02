import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, SearchX } from 'lucide-react'
import { Spinner } from './Spinner.jsx'
import { EmptyState } from './EmptyState.jsx'

export function Table({
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
}) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    if (!sort.key) return data
    return [...data].sort((a, b) => {
      const aVal = a[sort.key]
      const bVal = b[sort.key]
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

  function toggleSort(key) {
    setSort((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      return { key, dir: 'asc' }
    })
  }

  if (loading) {
    return (
      <div className="border border-border rounded-lg overflow-hidden bg-surface shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className="bg-background text-text-muted text-[11px] uppercase tracking-wider font-semibold px-4 py-3 text-left border-b border-border"
                >
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
    <div className={`border border-border rounded-lg overflow-hidden bg-surface shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={[
                    'bg-background text-text-muted text-[11px] uppercase tracking-wider font-semibold px-4 py-3 text-left border-b border-border',
                    sortable && col.sortKey !== false ? 'cursor-pointer select-none hover:text-text' : '',
                  ].join(' ')}
                  onClick={() => sortable && col.sortKey !== false && toggleSort(col.accessor)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {sortable && col.sortKey !== false && (
                      sort.key === col.accessor ? (
                        sort.dir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      ) : (
                        <ChevronsUpDown size={14} className="opacity-30" />
                      )
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row, rowIndex) => (
              <tr
                key={row.id ?? rowIndex}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-border last:border-b-0 ${onRowClick ? 'cursor-pointer' : ''} hover:bg-background transition-colors`}
              >
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className="px-4 py-3 text-sm text-text border-b border-border last:border-b-0">
                    {col.render ? col.render(row[col.accessor], row) : row[col.accessor] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageSize > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background text-sm">
          <span className="text-text-muted">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} de {sorted.length}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 rounded text-sm border border-border bg-surface disabled:opacity-40 disabled:cursor-default hover:bg-background transition-colors"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 rounded text-sm border border-border bg-surface disabled:opacity-40 disabled:cursor-default hover:bg-background transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
