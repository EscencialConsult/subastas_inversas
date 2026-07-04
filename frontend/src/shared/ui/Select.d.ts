import type { ReactNode, RefAttributes, SelectHTMLAttributes } from 'react'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode
  error?: ReactNode
  help?: ReactNode
  fieldClassName?: string
}

export const Select: (props: SelectProps & RefAttributes<HTMLSelectElement>) => ReactNode
