import { ReactNode, TextareaHTMLAttributes, forwardRef } from 'react'
import { FormField } from './FormField'

const base =
  'w-full px-3 py-2.5 border border-border rounded-md bg-surface text-text text-sm font-inherit transition-[border-color,box-shadow] duration-150 outline-none resize-y min-h-[80px] placeholder:text-text-muted/60'
const focus =
  'focus:border-primary focus:shadow-focus'
const disabled = 'disabled:bg-background disabled:text-text-muted disabled:cursor-default'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode
  error?: ReactNode
  help?: ReactNode
  fieldClassName?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, help, required = false, className = '', fieldClassName = '', id, ...props },
  ref,
) {
  return (
    <FormField label={label} error={error} help={help} required={required} htmlFor={id} className={fieldClassName}>
      {({ id: fieldId, describedBy, invalid }) => (
      <textarea
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
