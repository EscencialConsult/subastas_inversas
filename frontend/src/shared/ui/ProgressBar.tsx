interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showPercent?: boolean
  variant?: 'primary' | 'success' | 'warning'
  className?: string
}

const variantColors: Record<string, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercent = false,
  variant = 'primary',
  className = '',
}: ProgressBarProps) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100))

  return (
    <div className={className}>
      {(label || showPercent) && (
        <div className="mb-1 flex items-center justify-between text-sm">
          {label && <span className="font-medium text-text">{label}</span>}
          {showPercent && <span className="text-text-muted">{Math.round(percent)}%</span>}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${variantColors[variant]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
