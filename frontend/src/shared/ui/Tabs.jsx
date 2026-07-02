import { useState } from 'react'

export function Tabs({ tabs = [], defaultIndex = 0, onChange, className = '' }) {
  const [active, setActive] = useState(defaultIndex)

  function handleClick(index) {
    setActive(index)
    onChange?.(index)
  }

  return (
    <div className={className}>
      <div className="flex border-b border-border gap-0" role="tablist">
        {tabs.map((tab, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={active === i}
            onClick={() => handleClick(i)}
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
      {tabs[active] && <div className="pt-4">{tabs[active].content}</div>}
    </div>
  )
}
