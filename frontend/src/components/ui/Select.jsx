import { forwardRef } from 'react'
import { FormField } from './FormField.jsx'

const base =
  'w-full px-3 py-2.5 border border-border rounded-md bg-surface text-text text-sm font-inherit transition-[border-color,box-shadow] duration-150 outline-none appearance-none cursor-pointer'
const focus =
  'focus:border-primary focus:shadow-focus'
const disabled = 'disabled:bg-background disabled:text-text-muted disabled:cursor-default'

export const Select = forwardRef(function Select(
  { label, error, help, required = false, className = '', fieldClassName = '', id, children, ...props },
  ref,
) {
  return (
    <FormField label={label} error={error} help={help} required={required} htmlFor={id} className={fieldClassName}>
      {({ id: fieldId, describedBy, invalid }) => (
      <div className="relative">
        <select
          id={fieldId}
          ref={ref}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={`${base} ${focus} ${disabled} ${error ? 'border-error focus:border-error focus:shadow-error-focus' : ''} pr-8 ${className}`}
          required={required}
          {...props}
        >
          {children}
        </select>
        <svg
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      )}
    </FormField>
  )
})
