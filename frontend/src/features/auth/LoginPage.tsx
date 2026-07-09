import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { SubmitHandler, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../../auth/AuthContext'
import { Badge } from '../../shared/ui/Badge'
import { Alert } from '../../shared/ui/Alert'
import { ROLES } from '../../domain/roles'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { getErrorMessage } from '../../shared/query/queryClient'
import { PageShell } from '../../shared/ui/PageShell'
import { PageHeader } from '../../shared/ui/PageHeader'
import { FormSection } from '../../shared/ui/FormSection'
import { FormActions } from '../../shared/ui/FormActions'

const USUARIOS_DEMO = [
  { email: 'admin@sicst.com', rol: 'Super Admin', password: 'Admin123!' },
  { email: 'admin@prueba.com', rol: 'Admin tenant', password: '123456' },
  { email: 'usuario1@prueba.com', rol: 'Comprador', password: '123456' },
  { email: 'usuario2@prueba.com', rol: 'Evaluador', password: '123456' },
  { email: 'usuario3@prueba.com', rol: 'Autoridad', password: '123456' },
  { email: 'usuario4@prueba.com', rol: 'Auditor', password: '123456' },
  { email: 'ventas@kotler.com', rol: 'Proveedor', password: '123456' },
]

const loginSchema = z.object({
  email: z.string().trim().email('Ingresa un email valido.'),
  password: z.string().min(1, 'Ingresa tu contrasena.'),
  mfaCode: z.string().optional(),
})

type LoginFormValues = z.infer<typeof loginSchema>
type UsuarioDemo = (typeof USUARIOS_DEMO)[number]
type UsuarioPendiente = { email?: string } | null

export function LoginPage() {
  const { login, verificarMfa, cargando } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destino = location.state?.from?.pathname ?? '/'

  const [mfaToken, setMfaToken] = useState('')
  const [usuarioPendiente, setUsuarioPendiente] = useState<UsuarioPendiente>(null)
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    setValue,
    setError: setFieldError,
    clearErrors,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', mfaCode: '' },
  })

  const manejarSubmit: SubmitHandler<LoginFormValues> = async (datos) => {
    setError('')
    try {
      const respuesta = await login({ email: datos.email, password: datos.password })
      if ('requiereMfa' in respuesta && respuesta.requiereMfa) {
        setMfaToken(respuesta.mfaToken)
        setUsuarioPendiente(respuesta.usuarioPendiente)
        return
      }
      if ('usuario' in respuesta) {
        navigate(destinoSeguroPorRol(respuesta.usuario?.rol, destino), { replace: true })
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const manejarMfa: SubmitHandler<LoginFormValues> = async (datos) => {
    if (!/^\d{6}$/.test(datos.mfaCode ?? '')) {
      setFieldError('mfaCode', { message: 'Ingresa el codigo de 6 digitos.' })
      return
    }
    setError('')
    try {
      const respuesta = await verificarMfa({ mfaToken, code: datos.mfaCode })
      if ('requiereMfa' in respuesta) {
        setError('No se pudo completar la verificacion MFA.')
        return
      }
      navigate(destinoSeguroPorRol(respuesta.usuario?.rol, destino), { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  function usarDemo(usuario: UsuarioDemo) {
    setValue('email', usuario.email, { shouldValidate: true })
    setValue('password', usuario.password, { shouldValidate: true })
    setValue('mfaCode', '')
    clearErrors()
    setMfaToken('')
    setUsuarioPendiente(null)
  }

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
              <span className="truncate text-xs text-text-muted">Acceso al sistema</span>
            </span>
          </Link>
          <nav aria-label="Accesos publicos">
            <Button as={Link} to="/portal" variant="secondary">
              Portal publico
            </Button>
          </nav>
        </div>
      </header>

      <PageShell width="default" className="min-h-[calc(100vh-64px)]">
        <form
          className="mx-auto flex w-full max-w-xl flex-col gap-6"
          onSubmit={handleSubmit(mfaToken ? manejarMfa : manejarSubmit)}
        >
          <PageHeader
            eyebrow="Inicio de sesion"
            title="Ingresa a tu cuenta"
            description={
              mfaToken
                ? `Ingresa el codigo de tu app autenticadora${usuarioPendiente?.email ? ` para ${usuarioPendiente.email}` : ''}.`
                : 'Usa el email asignado para entrar al panel correspondiente.'
            }
            className="border-b-0 pb-0"
          />

          <FormSection
            title={mfaToken ? 'Verificacion MFA' : 'Credenciales'}
            description={mfaToken ? 'Completa el segundo factor para continuar.' : 'Ingresa email y contrasena para acceder.'}
          >
            {error && <Alert variant="error">{error}</Alert>}

            {!mfaToken ? (
              <div className="grid gap-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="tu@email.com"
                  autoComplete="username"
                  error={errors.email?.message}
                  required
                  {...register('email')}
                />

                <Input
                  label="Contrasena"
                  type="password"
                  placeholder="********"
                  autoComplete="current-password"
                  error={errors.password?.message}
                  required
                  {...register('password')}
                />
              </div>
            ) : (
              <div className="grid gap-4">
                <Input
                  label="Codigo MFA"
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  error={errors.mfaCode?.message}
                  required
                  {...register('mfaCode')}
                />
                <Button
                  variant="link"
                  type="button"
                  className="self-start"
                  onClick={() => {
                    setMfaToken('')
                    setValue('mfaCode', '')
                    clearErrors('mfaCode')
                    setUsuarioPendiente(null)
                  }}
                >
                  Usar otra cuenta
                </Button>
              </div>
            )}

            <FormActions align="between" className="-mx-5 -mb-5 mt-2 rounded-b-md">
              {!mfaToken ? (
                <p className="m-0 text-sm text-text-muted">
                  Sos proveedor?{' '}
                  <Link className="font-semibold text-success hover:underline" to="/registro-proveedor">
                    Registrate aca
                  </Link>
                </p>
              ) : (
                <span />
              )}
              <Button type="submit" loading={cargando}>
                {mfaToken ? 'Verificar codigo' : 'Ingresar'}
              </Button>
            </FormActions>
          </FormSection>

          {!mfaToken && (
            <div className="flex justify-center">
              <Button as={Link} variant="link" to="/portal">
                Ver portal publico sin ingresar
              </Button>
            </div>
          )}

          {!mfaToken && (
            <FormSection
              title="Usuarios de prueba"
              description="Selecciona uno para autocompletar el email y contrasena."
              actions={<Badge variant="neutral">Demo</Badge>}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                {USUARIOS_DEMO.map((usuario) => (
                  <Button
                    className="h-auto justify-start px-3 py-3 text-left"
                    key={usuario.email}
                    type="button"
                    variant="secondary"
                    onClick={() => usarDemo(usuario)}
                  >
                    <span className="flex min-w-0 flex-col items-start gap-1">
                      <span className="truncate text-sm font-semibold text-text">{usuario.email}</span>
                      <span className="text-xs text-text-muted">{usuario.rol}</span>
                    </span>
                  </Button>
                ))}
              </div>
            </FormSection>
          )}
        </form>
      </PageShell>
    </div>
  )
}

function destinoSeguroPorRol(rol: string | undefined, destino: string) {
  if (rol === ROLES.EVALUADOR) return '/evaluacion'
  if (rol === ROLES.PROVEEDOR) return '/proveedor'
  if (!destino || destino === '/login') return '/'
  return destino
}
