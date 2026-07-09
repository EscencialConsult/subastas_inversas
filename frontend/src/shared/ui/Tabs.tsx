import { KeyboardEvent, useId, useState } from 'react'
import type { ReactNode } from 'react'

interface TabItem {
  label: ReactNode
  content: ReactNode
}

interface TabsProps {
  tabs?: TabItem[]
  defaultIndex?: number
  onChange?: (index: number) => void
  className?: string
}

export function Tabs({ tabs = [], defaultIndex = 0, onChange, className = '' }: TabsProps) {
  const baseId = useId()
  const [active, setActive] = useState(defaultIndex)

  function setActiveTab(index: number) {
    setActive(index)
    onChange?.(index)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') {
      return
    }

    event.preventDefault()
    const lastIndex = tabs.length - 1
    let nextIndex = index

    if (event.key === 'ArrowRight') nextIndex = index === lastIndex ? 0 : index + 1
    if (event.key === 'ArrowLeft') nextIndex = index === 0 ? lastIndex : index - 1
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = lastIndex

    setActiveTab(nextIndex)
    document.getElementById(`${baseId}-tab-${nextIndex}`)?.focus()
  }

  return (
    <div className={className}>
      <div className="flex border-b border-border gap-0" role="tablist">
        {tabs.map((tab, i) => (
          <button
            key={i}
            id={`${baseId}-tab-${i}`}
            type="button"
            role="tab"
            aria-selected={active === i}
            aria-controls={`${baseId}-panel-${i}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActiveTab(i)}
            onKeyDown={(event) => handleKeyDown(event, i)}
            className={[
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              active === i
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text hover:border-border',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs[active] && (
        <div
          id={`${baseId}-panel-${active}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${active}`}
          className="pt-4"
        >
          {tabs[active].content}
        </div>
      )}
    </div>
  )
}
