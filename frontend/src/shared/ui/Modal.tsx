import { ReactNode, useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children?: ReactNode
  footer?: ReactNode
  closeOnOverlay?: boolean
  describedById?: string
}

export function Modal({
  open,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  closeOnOverlay = true,
  describedById,
}: ModalProps) {
  const generatedTitleId = useId()
  const titleId = title ? generatedTitleId : undefined
  const overlayRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<Element | null>(null)
  const [mounted, setMounted] = useState(false)
  const [entering, setEntering] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      requestAnimationFrame(() => setEntering(true))
    } else if (mounted) {
      setEntering(false)
      const timer = setTimeout(() => {
        setMounted(false)
      }, 180)
      return () => clearTimeout(timer)
    }

    return undefined
  }, [open])

  useEffect(() => {
    if (!mounted) {
      return undefined
    }

    previousFocusRef.current = document.activeElement

    const focusTimer = setTimeout(() => {
      if (!containerRef.current) return

      const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
        'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
      )

      if (focusableElements.length > 0) {
        focusableElements[0].focus()
      }
    }, 80)

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key !== 'Tab' || !containerRef.current) {
        return
      }

      const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
        'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
      )

      if (focusableElements.length === 0) {
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey && document.activeElement === firstElement) {
        lastElement.focus()
        e.preventDefault()
        return
      }

      if (!e.shiftKey && document.activeElement === lastElement) {
        firstElement.focus()
        e.preventDefault()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''

      if (previousFocusRef.current && typeof (previousFocusRef.current as HTMLElement).focus === 'function') {
        (previousFocusRef.current as HTMLElement).focus()
      }
    }
  }, [mounted, onClose])

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (closeOnOverlay && e.target === overlayRef.current) {
      onClose()
    }
  }

  return mounted ? (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 p-4 transition-opacity duration-180 ${entering ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-label={title ? undefined : 'Dialogo'}
      aria-describedby={describedById}
    >
      <div
        ref={containerRef}
        className={`bg-surface rounded-md w-full shadow-xl overflow-hidden transition-all duration-180 ease-out ${entering ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-3'}`}
        style={{ maxWidth: size === 'sm' ? '24rem' : size === 'lg' ? '42rem' : size === 'xl' ? '72rem' : '36rem' }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          {title && <h2 id={titleId} className="text-xl font-semibold text-text m-0">{title}</h2>}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={<X size={18} />}
            aria-label="Cerrar modal"
          />
        </div>
        <div className="px-6 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-6 pb-5">{footer}</div>}
      </div>
    </div>
  ) : null
}
