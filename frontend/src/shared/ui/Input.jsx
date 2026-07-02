import { forwardRef } from 'react'
import { FormField } from './FormField.jsx'

const base =
  'w-full px-3 py-2.5 border border-border rounded-md bg-surface text-text text-sm font-inherit transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-text-muted/60'
const focus =
  'focus:border-primary focus:shadow-focus'
const disabled = 'disabled:bg-background disabled:text-text-muted disabled:cursor-default'

export const Input = forwardRef(function Input(
  { label, error, help, required = false, className = '', fieldClassName = '', id, ...props },
  ref,
) {
  return (
    <FormField label={label} error={error} help={help} required={required} htmlFor={id} className={fieldClassName}>
      {({ id: fieldId, describedBy, invalid }) => (
      <input
        id={fieldId}
        ref={ref}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`${base} ${focus} ${disabled} ${error ? 'border-error focus:border-error focus:shadow-error-focus' : ''} ${className}`}
        required={required}
        {...props}
      />
      )}
    </FormField>
  )
})
