import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../context/ToastContext.jsx'
import { actualizarPerfil, cambiarContrasena } from '../../api/usersApi'
import { activarMfa, desactivarMfa, prepararMfa } from '../../api/authApi'
import { etiquetaRol } from '../../domain/roles'
import { User, Shield, Lock, Smartphone, CheckCircle, Save, RefreshCw, RotateCcw } from 'lucide-react'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input.jsx'

const perfilSchema = z.object({
  nombre: z.string().trim().min(2, 'Ingresa el nombre.'),
  apellido: z.string().trim().min(2, 'Ingresa el apellido.'),
  email: z.string().trim().email('Ingresa un email valido.'),
})

const passwordSchema = z
  .object({
    actual: z.string().min(1, 'Ingresa tu contrasena actual.'),
    nueva: z.string().min(6, 'La nueva contrasena debe tener al menos 6 caracteres.'),
    repetir: z.string().min(1, 'Repeti la nueva contrasena.'),
  })
  .refine((data) => data.nueva === data.repetir, {
    path: ['repetir'],
    message: 'La repeticion no coincide.',
  })

export function PerfilPage() {
  const { usuario, tenant, actualizarUsuarioSesion } = useAuth()

  return (
    <section className="form-pagina" style={{ maxWidth: 640 }}>
      <div className="encabezado">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={24} /> Mi perfil
        </h1>
      </div>

      <DatosPersonales
        usuario={usuario}
        tenant={tenant}
        onGuardado={actualizarUsuarioSesion}
      />
      <CambiarContrasena usuario={usuario} />
      <Mfa usuario={usuario} onGuardado={actualizarUsuarioSesion} />
    </section>
  )
}

function DatosPersonales({ usuario, tenant, onGuardado }) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
    },
  })

  async function manejarSubmit(datos) {
    setError('')
    setGuardando(true)
    try {
      const actualizado = await actualizarPerfil({ id: usuario.id, datos })
      onGuardado(actualizado)
      toast.success('Tus datos se guardaron.')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit(manejarSubmit)} noValidate>
      <h2 className="form__titulo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <User size={20} /> Datos personales
      </h2>

      {error && <Alert variant="error">{error}</Alert>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <Input label="Nombre" error={errors.nombre?.message} required {...register('nombre')} />
        <Input label="Apellido" error={errors.apellido?.message} required {...register('apellido')} />
        <div style={{ gridColumn: '1 / -1' }}>
          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            required
            {...register('email')}
          />
        </div>
      </div>

      <div className="perfil__solo-lectura" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <span><strong>Rol:</strong> {etiquetaRol(usuario.rol)}</span>
        {tenant && <span><strong>Organizacion:</strong> {tenant.nombre}</span>}
      </div>

      <div className="form__acciones">
        <Button type="submit" loading={guardando} icon={<Save size={16} />}>
          Guardar cambios
        </Button>
      </div>
    </form>
  )
}

function CambiarContrasena({ usuario }) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { actual: '', nueva: '', repetir: '' },
  })

  async function manejarSubmit(campos) {
    setError('')
    setGuardando(true)
    try {
      await cambiarContrasena({ id: usuario.id, ...campos })
      toast.success('Contrasena actualizada.')
      reset()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit(manejarSubmit)} noValidate>
      <h2 className="form__titulo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Lock size={20} /> Cambiar contrasena
      </h2>

      {error && <Alert variant="error">{error}</Alert>}

      <Input
        label="Contrasena actual"
        type="password"
        autoComplete="current-password"
        error={errors.actual?.message}
        required
        {...register('actual')}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <Input
          label="Nueva contrasena"
          type="password"
          autoComplete="new-password"
          error={errors.nueva?.message}
          required
          {...register('nueva')}
        />
        <Input
          label="Repetir nueva"
          type="password"
          autoComplete="new-password"
          error={errors.repetir?.message}
          required
          {...register('repetir')}
        />
      </div>

      <div className="form__acciones">
        <Button type="submit" loading={guardando} icon={<RefreshCw size={16} />}>
          Cambiar contrasena
        </Button>
      </div>
    </form>
  )
}

function Mfa({ usuario, onGuardado }) {
  const [setup, setSetup] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()

  async function iniciarSetup() {
    setCargando(true)
    setError('')
    try {
      const data = await prepararMfa()
      setSetup(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  async function confirmar() {
    setCargando(true)
    setError('')
    try {
      await activarMfa({ code: codigo })
      onGuardado({ ...usuario, mfaActivo: true })
      setSetup(null)
      setCodigo('')
      toast.success('MFA activado.')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  async function desactivar() {
    setCargando(true)
    setError('')
    try {
      await desactivarMfa({ code: codigo })
      onGuardado({ ...usuario, mfaActivo: false })
      setCodigo('')
      toast.success('MFA desactivado.')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="form">
      <h2 className="form__titulo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Shield size={20} /> Autenticacion multifactor
      </h2>

      {error && <Alert variant="error">{error}</Alert>}

      <p className="campo__ayuda" style={{ marginBottom: 12 }}>
        Estado: <Badge variant={usuario.mfaActivo ? 'success' : 'neutral'}>{usuario.mfaActivo ? 'Activo' : 'Inactivo'}</Badge>
      </p>

      {!usuario.mfaActivo && !setup && (
        <div className="form__acciones">
          <Button type="button" onClick={iniciarSetup} disabled={cargando} icon={<Smartphone size={16} />}>
            Activar MFA
          </Button>
        </div>
      )}

      {!usuario.mfaActivo && setup && (
        <>
          <div className="perfil__solo-lectura">
            <span><strong>Secret:</strong> <code>{setup.secret}</code></span>
            <span><strong>URI:</strong> <code>{setup.otpAuthUri}</code></span>
          </div>
          <Input
            label="Codigo de verificacion"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
          />
          <div className="form__acciones">
            <Button variant="ghost" type="button" onClick={() => setSetup(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmar} disabled={cargando} icon={<CheckCircle size={16} />}>
              Confirmar MFA
            </Button>
          </div>
        </>
      )}

      {usuario.mfaActivo && (
        <>
          <Input
            label="Codigo actual"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
          />
          <div className="form__acciones">
            <Button variant="danger" type="button" onClick={desactivar} disabled={cargando} icon={<RotateCcw size={16} />}>
              Desactivar MFA
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
