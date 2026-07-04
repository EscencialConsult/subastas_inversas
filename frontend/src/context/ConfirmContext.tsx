/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, HelpCircle, Info } from 'lucide-react'
import { Modal } from '../shared/ui/Modal'
import { Button } from '../shared/ui/Button'

type ConfirmVariant = 'danger' | 'warning' | 'info'

interface ConfirmOptions {
  variant?: ConfirmVariant
  title?: string
  message?: ReactNode
  confirmText?: string
  cancelText?: string
}

interface ConfirmState extends Required<ConfirmOptions> {
  resolve: (result: boolean) => void
}

interface ConfirmApi {
  confirm: (options?: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmApi | null>(null)

const variants = {
  danger: {
    icon: AlertTriangle,
    iconClass: 'text-error',
    buttonVariant: 'danger',
    title: 'Confirmar acción',
    confirmText: 'Confirmar',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-warning',
    buttonVariant: 'secondary',
    title: 'Confirmar acción',
    confirmText: 'Confirmar',
  },
  info: {
    icon: Info,
    iconClass: 'text-info',
    buttonVariant: 'primary',
    title: 'Confirmar acción',
    confirmText: 'Confirmar',
  },
}

const defaultOptions: Required<ConfirmOptions> = {
  variant: 'danger',
  title: 'Confirmar acción',
  message: 'Esta acción no se puede deshacer.',
  confirmText: 'Confirmar',
  cancelText: 'Cancelar',
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = useCallback((options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...defaultOptions, ...options, resolve })
    })
  }, [])

  const close = useCallback((result: boolean) => {
    setState((current) => {
      current?.resolve(result)
      return null
    })
  }, [])

  const value = useMemo(() => ({ confirm }), [confirm])
  const variant = variants[state?.variant ?? 'danger'] ?? variants.danger
  const Icon = variant?.icon ?? HelpCircle

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={Boolean(state)}
        title={state?.title ?? variant.title}
        onClose={() => close(false)}
        closeOnOverlay={false}
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              {state?.cancelText ?? defaultOptions.cancelText}
            </Button>
            <Button variant={variant.buttonVariant as 'danger' | 'secondary' | 'primary'} onClick={() => close(true)}>
              {state?.confirmText ?? variant.confirmText}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <Icon size={22} className={`mt-0.5 shrink-0 ${variant.iconClass}`} />
          <p className="text-sm text-text leading-relaxed m-0">{state?.message}</p>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx.confirm
}
