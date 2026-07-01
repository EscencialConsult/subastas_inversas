import { ElementType, MouseEvent, ReactNode, HTMLAttributes } from 'react'
import { Spinner } from './Spinner.jsx'

const variants = {
  primary:
    'bg-primary text-white shadow-sm hover:bg-primary-hover active:scale-[0.97] aria-disabled:opacity-50 aria-disabled:cursor-default aria-disabled:shadow-none disabled:opacity-50 disabled:cursor-default disabled:shadow-none',
  secondary:
    'bg-surface text-text border border-border hover:bg-background hover:border-primary hover:text-primary aria-disabled:opacity-50 aria-disabled:cursor-default',
  danger:
    'bg-error text-white hover:bg-error-hover active:scale-[0.97] aria-disabled:opacity-50 aria-disabled:cursor-default disabled:opacity-50 disabled:cursor-default',
  ghost:
    'text-text-muted hover:bg-background hover:text-text aria-disabled:opacity-50 aria-disabled:cursor-default',
  outline:
    'border border-border text-text bg-surface hover:border-primary hover:text-primary aria-disabled:opacity-50 aria-disabled:cursor-default',
  link:
    'text-primary hover:text-primary-hover underline-offset-2 hover:underline p-0 h-auto aria-disabled:opacity-50 aria-disabled:cursor-default',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-[14px] py-2 text-base',
  lg: 'px-5 py-2.5 text-lg',
}

export interface ButtonProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'link'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
  icon?: ReactNode
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  type = 'button',
  onClick,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading
  const isNativeButton = Component === 'button'

  function handleClick(event: MouseEvent<HTMLElement>) {
    if (isDisabled) {
      event.preventDefault()
      return
    }

    onClick?.(event)
  }

  return (
    <Component
      {...(isNativeButton ? { type, disabled: isDisabled } : { 'aria-disabled': isDisabled || undefined })}
      onClick={handleClick}
      {...props}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 outline-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        icon && !children ? 'p-2 aspect-square' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading ? (
        <Spinner size="sm" className={children ? '' : ''} />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
    </Component>
  )
}
