import { useId, useState } from 'react'
import type { ReactNode } from 'react'

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

export function Tooltip({ text, position = 'top', children }: { text: ReactNode; position?: TooltipPosition; children: ReactNode }) {
  const [visible, setVisible] = useState(false)
  const tooltipId = useId()

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      aria-describedby={visible ? tooltipId : undefined}
    >
      {children}
      {visible && (
        <span
          id={tooltipId}
          role="tooltip"
          className={`absolute z-50 px-2 py-1 text-xs text-white bg-text rounded whitespace-nowrap pointer-events-none ${positions[position]}`}
        >
          {text}
        </span>
      )}
    </span>
  )
}
