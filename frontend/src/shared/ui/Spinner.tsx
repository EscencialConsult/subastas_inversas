const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
}

type SpinnerSize = keyof typeof sizes

export function Spinner({ size = 'md', className = '' }: { size?: SpinnerSize; className?: string }) {
  return (
    <div
      className={`animate-spin rounded-full border-primary/30 border-t-primary ${sizes[size]} ${className}`}
      role="status"
      aria-label="Cargando"
    />
  )
}
