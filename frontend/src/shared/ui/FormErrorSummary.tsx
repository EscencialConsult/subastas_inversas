import { AlertCircle } from 'lucide-react'

export interface FormErrorSummaryProps {
  title?: string
  errors?: Array<string | { field?: string; message: string }>
  className?: string
}

export function FormErrorSummary({
  title = 'Revisa los datos del formulario',
  errors = [],
  className = '',
}: FormErrorSummaryProps) {
  if (errors.length === 0) return null

  return (
    <div
      className={[
        'rounded-md border border-error/25 bg-error-bg px-4 py-3 text-error',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="alert"
    >
      <div className="flex gap-3">
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <h2 className="m-0 text-sm font-semibold">{title}</h2>
          <ul className="m-0 mt-2 space-y-1 pl-4 text-sm">
            {errors.map((error, index) => {
              const message = typeof error === 'string' ? error : error.message
              const field = typeof error === 'string' ? null : error.field
              return (
                <li key={`${field ?? 'error'}-${index}`}>
                  {field ? <span className="font-medium">{field}: </span> : null}
                  {message}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
