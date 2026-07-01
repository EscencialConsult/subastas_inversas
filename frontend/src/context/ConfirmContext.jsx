/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertTriangle, HelpCircle, Info } from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'

const ConfirmContext = createContext(null)

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

const defaultOptions = {
  variant: 'danger',
  title: 'Confirmar acción',
  message: 'Esta acción no se puede deshacer.',
  confirmText: 'Confirmar',
  cancelText: 'Cancelar',
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setState({ ...defaultOptions, ...options, resolve })
    })
  }, [])

  const close = useCallback((result) => {
    setState((current) => {
      current?.resolve(result)
      return null
    })
  }, [])

  const value = useMemo(() => ({ confirm }), [confirm])
  const variant = variants[state?.variant] ?? variants.danger
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
            <Button variant={variant.buttonVariant} onClick={() => close(true)}>
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
