import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
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

export function RegistroProveedorPage() {
  const [confirmacion, setConfirmacion] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
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

  async function manejarSubmit(datos) {
    setConfirmacion('')
    registroMutation.mutate({ datos })
  }

  const error = getErrorMessage(registroMutation.error, '')

  return (
    <div className="public-page">
      <header className="page-header">
        <div className="contenedor page-header__inner">
          <Link to="/portal" className="page-header__brand">
            <span className="page-header__logo">SC</span>
            <span className="flex flex-col">
              <span className="page-header__title">SICST</span>
              <span className="page-header__subtitle">Registro proveedor</span>
            </span>
          </Link>
          <div className="page-header__nav">
            <Link to="/portal" className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-background disabled:opacity-60">
              Portal publico
            </Link>
            <Link to="/login" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60">
              Ingresar
            </Link>
          </div>
        </div>
      </header>

      <section className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-background px-4 py-10">
        <form className="w-full max-w-xl space-y-5 rounded-md border border-border bg-surface p-6 shadow-sm" onSubmit={handleSubmit(manejarSubmit)} noValidate>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">Crear cuenta</span>
            <h2 className="mt-2 text-2xl font-semibold text-text">Registro de proveedor</h2>
            <p className="mt-2 text-sm text-text-muted">
              Completa los datos principales de tu empresa para solicitar el alta.
            </p>
          </div>

          {error && <Alert variant="error" className="mt-16">{error}</Alert>}
          {confirmacion && <Alert variant="info" className="mt-16">{confirmacion}</Alert>}

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

            <div className="grid grid-cols-2 gap-3" style={{ gridColumn: '1 / -1' }}>
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

          <Button className="mt-16" fullWidth type="submit" loading={registroMutation.isPending}>
            Enviar a verificacion
          </Button>

          <p className="text-center mt-16 text-sm text-muted">
            Ya tenes cuenta?{' '}
            <Link className="text-success font-bold underline" to="/login">
              Ingresar
            </Link>
          </p>
        </form>
      </section>
    </div>
  )
}
