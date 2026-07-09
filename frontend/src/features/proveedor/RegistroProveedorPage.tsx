import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { SubmitHandler, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Clock3, MailCheck, ShieldCheck } from 'lucide-react'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Button } from '../../shared/ui/Button'
import { FormActions } from '../../shared/ui/FormActions'
import { FormSection } from '../../shared/ui/FormSection'
import { Input } from '../../shared/ui/Input'
import { Modal } from '../../shared/ui/Modal'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { registrarProveedorMutation } from './data/proveedoresData'

const VACIO = {
  razonSocial: '',
  cuit: '',
  email: '',
  rubro: '',
  provincia: '',
  localidad: '',
}

const registroSchema = z.object({
  razonSocial: z.string().trim().min(2, 'Ingresa la razon social.'),
  cuit: z.string().trim().min(8, 'Ingresa el CUIT.'),
  email: z.string().trim().email('Ingresa un email valido.'),
  rubro: z.string().trim().min(2, 'Ingresa el rubro.'),
  provincia: z.string().trim().min(2, 'Ingresa la provincia.'),
  localidad: z.string().trim().min(2, 'Ingresa la localidad.'),
})

type RegistroFormValues = z.infer<typeof registroSchema>

export function RegistroProveedorPage() {
  const [confirmacion, setConfirmacion] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegistroFormValues>({
    resolver: zodResolver(registroSchema),
    defaultValues: VACIO,
  })

  const registroMutation = useMutation({
    mutationFn: registrarProveedorMutation,
    onSuccess: (respuesta) => {
      setConfirmacion(respuesta || 'Tus datos fueron enviados a verificacion.')
      reset(VACIO)
    },
  })

  const manejarSubmit: SubmitHandler<RegistroFormValues> = async (datos) => {
    setConfirmacion(null)
    registroMutation.mutate({ datos })
  }

  const error = getErrorMessage(registroMutation.error, '')

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/portal" className="flex min-w-0 items-center gap-3 text-text transition-colors hover:text-primary">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
              SC
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-base font-semibold leading-tight">SICST</span>
              <span className="truncate text-xs text-text-muted">Registro proveedor</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Accesos publicos">
            <Button as={Link} to="/portal" variant="secondary">
              Portal publico
            </Button>
            <Button as={Link} to="/login">
              Ingresar
            </Button>
          </nav>
        </div>
      </header>

      <PageShell width="default" className="min-h-[calc(100vh-64px)]">
        <form className="mx-auto flex w-full max-w-xl flex-col gap-6" onSubmit={handleSubmit(manejarSubmit)} noValidate>
          <PageHeader
            eyebrow="Crear cuenta"
            title="Registro de proveedor"
            description="Completa los datos principales de tu empresa para solicitar el alta."
            className="border-b-0 pb-0"
          />

          <FormSection title="Datos de la empresa" description="Estos datos se usan para identificar y evaluar a la empresa proveedora.">
            {error && <Alert variant="error">{error}</Alert>}

            <div className="grid gap-4">
              <Input
                label="Razon social"
                placeholder="Insumos del Norte SRL"
                error={errors.razonSocial?.message}
                required
                {...register('razonSocial')}
              />
              <Input
                label="CUIT"
                placeholder="30-12345678-1"
                error={errors.cuit?.message}
                required
                {...register('cuit')}
              />
              <Input
                label="Email"
                type="email"
                placeholder="ventas@empresa.com"
                autoComplete="username"
                error={errors.email?.message}
                required
                {...register('email')}
              />
              <Input
                label="Rubro"
                placeholder="Construccion, limpieza, tecnologia"
                error={errors.rubro?.message}
                required
                {...register('rubro')}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Provincia"
                  placeholder="Tucuman"
                  error={errors.provincia?.message}
                  required
                  {...register('provincia')}
                />
                <Input
                  label="Localidad"
                  placeholder="San Miguel"
                  error={errors.localidad?.message}
                  required
                  {...register('localidad')}
                />
              </div>
            </div>

            <FormActions align="between" className="-mx-5 -mb-5 mt-2 rounded-b-md">
              <p className="m-0 text-sm text-text-muted">
                Ya tenes cuenta?{' '}
                <Link className="font-semibold text-success hover:underline" to="/login">
                  Ingresar
                </Link>
              </p>
              <Button type="submit" loading={registroMutation.isPending}>
                Enviar a verificacion
              </Button>
            </FormActions>
          </FormSection>
        </form>
      </PageShell>

      <Modal
        open={Boolean(confirmacion)}
        onClose={() => setConfirmacion(null)}
        title="Solicitud enviada"
        closeOnOverlay={false}
        footer={(
          <>
            <Button as={Link} to="/portal" variant="secondary" onClick={() => setConfirmacion(null)}>
              Volver al portal
            </Button>
            <Button as={Link} to="/login" onClick={() => setConfirmacion(null)}>
              Ir a ingresar
            </Button>
          </>
        )}
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-md border border-success/30 bg-success-bg p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <div>
              <p className="m-0 font-semibold text-text">Recibimos tus datos correctamente.</p>
              <p className="mt-1 text-sm text-text-muted">{confirmacion}</p>
            </div>
          </div>

          <div className="grid gap-3">
            <PasoRegistro
              icono={<ShieldCheck size={18} />}
              titulo="Verificacion fiscal"
              texto="Validaremos CUIT, razon social y datos principales del proveedor."
            />
            <PasoRegistro
              icono={<Clock3 size={18} />}
              titulo="Revision administrativa"
              texto="Un administrador revisara la solicitud y la documentacion requerida."
            />
            <PasoRegistro
              icono={<MailCheck size={18} />}
              titulo="Aviso por email"
              texto="Si la cuenta queda habilitada, vas a recibir las instrucciones de acceso."
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

function PasoRegistro({ icono, titulo, texto }: { icono: React.ReactNode; titulo: string; texto: string }) {
  return (
    <div className="flex gap-3 rounded-md border border-border bg-background p-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
        {icono}
      </span>
      <div>
        <p className="m-0 text-sm font-semibold text-text">{titulo}</p>
        <p className="mt-1 text-sm text-text-muted">{texto}</p>
      </div>
    </div>
  )
}
