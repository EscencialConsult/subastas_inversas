import type { ReactNode } from 'react'

export function AnimatedPage({ children }: { children: ReactNode }) {
  return <div className="animate-fadeIn">{children}</div>
}
export default AnimatedPage
