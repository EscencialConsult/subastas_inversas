import { Badge, BadgeProps } from './Badge'

const statusVariants: Record<string, BadgeProps['variant']> = {
  active: 'success',
  approved: 'success',
  adjudicated: 'success',
  open: 'success',
  published: 'info',
  draft: 'neutral',
  pending: 'warning',
  pendingapproval: 'warning',
  scheduled: 'warning',
  evaluation: 'warning',
  rejected: 'error',
  cancelled: 'error',
  closed: 'neutral',
  blocked: 'error',
  expired: 'error',
}

export interface StatusBadgeProps {
  status: string
  label?: string
  variant?: BadgeProps['variant']
  className?: string
}

export function StatusBadge({ status, label, variant, className = '' }: StatusBadgeProps) {
  const normalized = status.replace(/[\s_-]/g, '').toLowerCase()
  return (
    <Badge variant={variant ?? statusVariants[normalized] ?? 'neutral'} className={className}>
      {label ?? status}
    </Badge>
  )
}
