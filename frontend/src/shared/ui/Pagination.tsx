/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState } from 'react'
import { Button } from './Button'

export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50]

export function usePagination<T>(items: T[] = [], { initialPageSize = 10 }: { initialPageSize?: number } = {}) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, totalPages - 1)

  const paginatedItems = useMemo(
    () => items.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
    [items, currentPage, pageSize],
  )

  function changePageSize(value: number | string) {
    setPageSize(Number(value))
    setPage(0)
  }

  return {
    page: currentPage,
    pageSize,
    totalPages,
    totalItems: items.length,
    paginatedItems,
    setPage,
    setPageSize: changePageSize,
  }
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number | string) => void
  pageSizeOptions?: number[]
}) {
  if (totalItems <= pageSize) return null

  const from = totalItems === 0 ? 0 : page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, totalItems)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border border-border border-t-0 rounded-b-md bg-background text-sm">
      <span className="text-text-muted">
        {from}-{to} de {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-text-muted">
          Filas
          <select
            className="px-2 py-1 rounded border border-border bg-surface text-text"
            value={pageSize}
            onChange={(event) => onPageSizeChange(event.target.value)}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <span className="text-text-muted min-w-16 text-center">
          {page + 1} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
