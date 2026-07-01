import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../../auth/AuthContext'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { ROLES } from '../../domain/roles'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input.jsx'

const USUARIOS_DEMO = [
  { email: 'admin@sicst.com', rol: 'Super Admin', password: 'Admin123!' },
  { email: 'admin@prueba.com', rol: 'Admin tenant', password:'123456' },
  { email: 'usuario1@prueba.com', rol: 'Comprador', password:'123456' },
  { email: 'usuario2@prueba.com', rol: 'Evaluador', password:'123456' },
  { email: 'usuario3@prueba.com', rol: 'Autoridad', password:'123456' },
  { email: 'usuario4@prueba.com', rol: 'Auditor', password:'123456' },
  { email: 'ventas@kotler.com', rol: 'Proveedor', password:'123456' },
]

const loginSchema = z.object({
  email: z.string().trim().email('Ingresá un email válido.'),
  password: z.string().min(1, 'Ingresá tu contraseña.'),
  mfaCode: z.string().optional(),
})

export function LoginPage() {
  const { login, verificarMfa, cargando } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destino = location.state?.from?.pathname ?? '/'

  const [mfaToken, setMfaToken] = useState('')
  const [usuarioPendiente, setUsuarioPendiente] = useState(null)
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    setValue,
    setError: setFieldError,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', mfaCode: '' },
  })

  async function manejarSubmit(datos) {
    setError('')
    try {
      const respuesta = await login({ email: datos.email, password: datos.password })
      if (respuesta?.requiereMfa) {
        setMfaToken(respuesta.mfaToken)
        setUsuarioPendiente(respuesta.usuarioPendiente)
        return
      }
      navigate(destinoSeguroPorRol(respuesta.usuario?.rol, destino), { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  async function manejarMfa(datos) {
    if (!/^\d{6}$/.test(datos.mfaCode ?? '')) {
      setFieldError('mfaCode', { message: 'Ingresá el código de 6 dígitos.' })
      return
    }
    setError('')
    try {
      const usuario = await verificarMfa({ mfaToken, code: datos.mfaCode })
      navigate(destinoSeguroPorRol(usuario?.rol, destino), { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  function usarDemo(usuario) {
    setValue('email', usuario.email, { shouldValidate: true })
    setValue('password', usuario.password, { shouldValidate: true })
    setValue('mfaCode', '')
    clearErrors()
    setMfaToken('')
    setUsuarioPendiente(null)
  }

  return (
    <div className="public-page">
      <header className="page-header">
        <div className="contenedor page-header__inner">
          <Link to="/portal" className="page-header__brand">
            <span className="page-header__logo">SC</span>
            <span className="flex flex-col">
              <span className="page-header__title">SICST</span>
              <span className="page-header__subtitle">Acceso al sistema</span>
            </span>
          </Link>
          <nav className="page-header__nav">
            <Button as={Link} to="/portal" variant="secondary">
              Portal público
            </Button>
          </nav>
        </div>
      </header>

      <section className="public-form">
        <form
          className="public-form__card"
          onSubmit={handleSubmit(mfaToken ? manejarMfa : manejarSubmit)}
        >
          <div>
            <span className="public-form__tag">Inicio de sesion</span>
            <h1 className="public-form__title">Ingresa a tu cuenta</h1>
            <p className="public-form__desc">
              {mfaToken
                ? `Ingresa el codigo de tu app autenticadora${usuarioPendiente?.email ? ` para ${usuarioPendiente.email}` : ''}.`
                : 'Usa el email asignado para entrar al panel correspondiente.'}
            </p>
          </div>

          {error && <Alert variant="error" className="mt-16">{error}</Alert>}

          {!mfaToken ? (
            <div className="public-form__grid">
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
            <div className="public-form__grid">
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
                className="mt-1 self-start"
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

          <Button
            className="mt-16"
            fullWidth
            type="submit"
            loading={cargando}
          >
            {mfaToken ? 'Verificar codigo' : 'Ingresar'}
          </Button>

          {!mfaToken && (
            <div className="text-center mt-16 text-sm">
              <p className="text-muted">
                Sos proveedor?{' '}
                <Link className="text-success font-bold" to="/registro-proveedor">
                  Registrate aca
                </Link>
              </p>
              <Button as={Link} variant="link" className="mt-8" to="/portal">
                Ver portal público sin ingresar
              </Button>
            </div>
          )}

          {!mfaToken && (
            <div className="demo-section">
              <div className="demo-section__header">
                <div>
                  <h2 className="demo-section__title">Usuarios de prueba</h2>
                  <p className="demo-section__help">
                    Selecciona uno para autocompletar el email y contraseña.
                  </p>
                </div>
                <Badge variant="neutral">Demo</Badge>
              </div>
              <div className="demo-section__list">
                {USUARIOS_DEMO.map((usuario) => (
                  <button
                    className="demo-section__user"
                    key={usuario.email}
                    type="button"
                    onClick={() => usarDemo(usuario)}
                  >
                    <span className="demo-section__user-email">{usuario.email}</span>
                    <span className="demo-section__user-rol">{usuario.rol}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </section>
    </div>
  )
}

function destinoSeguroPorRol(rol, destino) {
  if (rol === ROLES.EVALUADOR) return '/evaluacion'
  if (rol === ROLES.PROVEEDOR) return '/proveedor'
  if (!destino || destino === '/login') return '/'
  return destino
}
