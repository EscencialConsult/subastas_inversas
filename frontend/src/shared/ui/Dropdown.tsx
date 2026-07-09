import { useState, useRef, useEffect, useCallback, cloneElement, isValidElement } from 'react'
import type { ReactNode, KeyboardEvent, ReactElement } from 'react'

interface DropdownItem {
  label: ReactNode
  disabled?: boolean
  onClick?: () => void
}

interface DropdownProps {
  trigger: ReactNode
  items?: DropdownItem[]
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ trigger, items = [], align = 'left', className = '' }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [focusIndex, setFocusIndex] = useState(-1)
  const ref = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const close = useCallback(() => {
    setOpen(false)
    setFocusIndex(-1)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) {
        close()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [close])

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length)
  }, [items.length])

  function handleTriggerClick() {
    setOpen((prev) => {
      if (!prev) setFocusIndex(0)
      return !prev
    })
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleTriggerClick()
    }
    if (e.key === 'ArrowDown' && !open) {
      e.preventDefault()
      setOpen(true)
      setFocusIndex(0)
    }
  }

  function handleItemKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = (index + 1) % items.length
      setFocusIndex(next)
      itemRefs.current[next]?.focus()
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = (index - 1 + items.length) % items.length
      setFocusIndex(prev)
      itemRefs.current[prev]?.focus()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
    if (e.key === 'Tab') {
      close()
    }
  }

  return (
    <div className={`relative inline-block ${className}`} ref={ref}>
      <div
        ref={triggerRef}
        className="inline-flex cursor-pointer items-center"
        onClick={handleTriggerClick}
      >
        {isValidElement(trigger) ? cloneElement(trigger as ReactElement<Record<string, unknown>>, {
          'aria-haspopup': 'true',
          'aria-expanded': open,
          onKeyDown: (e: React.KeyboardEvent) => {
            (trigger.props as { onKeyDown?: (e: React.KeyboardEvent) => void })?.onKeyDown?.(e)
            handleTriggerKeyDown(e as unknown as React.KeyboardEvent<HTMLDivElement>)
          },
        }) : trigger}
      </div>
      {open && (
        <div
          role="menu"
          className={[
            'absolute z-50 min-w-[160px] bg-surface border border-border rounded-md shadow-lg py-1 mt-1',
            align === 'right' ? 'right-0' : 'left-0',
          ].join(' ')}
        >
          {items.map((item, i) => (
            <button
              key={i}
              ref={(el) => { itemRefs.current[i] = el }}
              type="button"
              role="menuitem"
              className="w-full text-left px-3 py-2 text-sm text-text hover:bg-background transition-colors disabled:opacity-50 disabled:cursor-default"
              disabled={item.disabled}
              tabIndex={focusIndex === i ? 0 : -1}
              onClick={() => {
                item.onClick?.()
                close()
              }}
              onKeyDown={(e) => handleItemKeyDown(e, i)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
