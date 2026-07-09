import { ReactNode, useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface CollapsibleProps {
  title: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

export function Collapsible({ title, children, defaultOpen = false, className = '' }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()

  return (
    <div className={className}>
      <button
        type="button"
        id={`${id}-trigger`}
        aria-expanded={open}
        aria-controls={`${id}-content`}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-text transition-colors hover:bg-background"
      >
        {title}
        <ChevronDown
          size={16}
          className="shrink-0 text-text-muted transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <div
        id={`${id}-content`}
        role="region"
        aria-labelledby={`${id}-trigger`}
        className="grid transition-all duration-200"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1">{children}</div>
        </div>
      </div>
    </div>
  )
}
