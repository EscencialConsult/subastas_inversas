import type { InputHTMLAttributes, ReactNode, RefAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode
  error?: ReactNode
  help?: ReactNode
  fieldClassName?: string
}

export const Input: (props: InputProps & RefAttributes<HTMLInputElement>) => ReactNode
