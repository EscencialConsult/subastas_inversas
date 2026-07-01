import { useId } from 'react'

export function FormField({
  label,
  error,
  help,
  required = false,
  htmlFor,
  className = '',
  children,
}) {
  const generatedId = useId()
  const fieldId = htmlFor || generatedId
  const helpId = help ? `${fieldId}-help` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined

  const content =
    typeof children === 'function'
      ? children({ id: fieldId, describedBy, invalid: Boolean(error) })
      : children

  return (
    <div className={`flex flex-col gap-1.5 mb-4 ${className}`}>
      {label && (
        <label htmlFor={fieldId} className="text-sm font-semibold text-text">
          {label}
          {required && <span className="text-error ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      {content}
      {help && !error && (
        <span id={helpId} className="text-xs text-text-muted">
          {help}
        </span>
      )}
      {error && (
        <span id={errorId} className="text-xs text-error">
          {error}
        </span>
      )}
    </div>
  )
}
