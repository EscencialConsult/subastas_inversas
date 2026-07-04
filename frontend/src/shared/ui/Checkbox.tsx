import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: ReactNode
  error?: ReactNode
  help?: ReactNode
  className?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, error, help, className = '', id, ...props }, ref) {
  const generatedId = useId()
  const fieldId = id || generatedId
  const helpId = help ? `${fieldId}-help` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined

  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={fieldId} className="flex items-center gap-2 cursor-pointer">
        <input
          id={fieldId}
          ref={ref}
          type="checkbox"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className="h-4 w-4 rounded border-border text-primary accent-primary cursor-pointer disabled:cursor-default"
          {...props}
        />
        {label && <span className="text-sm text-text select-none">{label}</span>}
      </label>
      {help && !error && <span id={helpId} className="text-xs text-text-muted mt-1 block">{help}</span>}
      {error && <span id={errorId} className="text-xs text-error mt-1 block">{error}</span>}
    </div>
  )
})
