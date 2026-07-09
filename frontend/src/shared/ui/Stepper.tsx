import { Check } from 'lucide-react'
import { Button } from './Button'

export interface Step {
  nro: number
  label: string
  state: 'completed' | 'active' | 'pending' | 'error'
  completado?: boolean
}

export interface StepperProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (step: number) => void
  className?: string
}

export function Stepper({ steps, currentStep, onStepClick, className = '' }: StepperProps) {
  const totalSteps = steps.length
  const progress = totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0

  return (
    <div
      className={`relative overflow-hidden rounded-md border border-border bg-surface p-4 shadow-sm ${className}`}
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label="Progreso del asistente"
    >
      <div className="absolute left-4 right-4 top-8 h-0.5 rounded-full bg-border" aria-hidden="true" />
      <div
        className="absolute left-4 top-8 h-0.5 origin-left rounded-full bg-primary transition-transform duration-200"
        style={{ right: '1rem', transform: `scaleX(${progress / 100})` }}
        aria-hidden="true"
      />
      <ol className="relative z-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {steps.map((step) => {
          const isActive = currentStep === step.nro
          const isCompleted = step.state === 'completed'
          const isError = step.state === 'error'
          const isPending = step.state === 'pending'
          const canNavigate = isCompleted || isActive
          let variant: 'primary' | 'secondary' | 'ghost' = 'ghost'
          if (isActive) variant = 'primary'
          else if (isCompleted) variant = 'secondary'

          return (
            <li key={step.nro}>
              <Button
                type="button"
                variant={variant}
                size="sm"
                className="h-full w-full flex-col gap-1 px-2 py-2"
                disabled={!canNavigate}
                onClick={() => canNavigate && onStepClick?.(step.nro)}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className={`relative flex h-6 w-6 items-center justify-center rounded-full border text-xs ${isError ? 'border-error text-error' : 'border-current'}`}>
                  {isCompleted ? <Check size={14} aria-hidden="true" /> : step.nro}
                  {step.completado !== undefined && !isPending && (
                    <span
                      className={`absolute -right-1 -top-1 h-2 w-2 rounded-full ${
                        step.completado ? 'bg-success' : 'bg-warning'
                      }`}
                      aria-label={step.completado ? 'Completado' : 'Incompleto'}
                    />
                  )}
                </span>
                <span className="text-center text-xs leading-tight">{step.label}</span>
              </Button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
