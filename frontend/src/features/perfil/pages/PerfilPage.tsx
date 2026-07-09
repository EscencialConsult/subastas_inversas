import { ReactNode, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle, Lock, RefreshCw, RotateCcw, Save, Shield, Smartphone, User } from 'lucide-react'
import { useAuth } from '../../../auth/AuthContext'
import { useToast } from '../../../context/ToastContext'
import type { TenantSesion, UsuarioSesion } from '../../../shared/api/authApi'
import { etiquetaRol } from '../../../domain/roles'
import { getErrorMessage } from '../../../shared/query/queryClient'
import { Alert } from '../../../shared/ui/Alert'
import { Button } from '../../../shared/ui/Button'
import { FormSection } from '../../../shared/ui/FormSection'
import { Input } from '../../../shared/ui/Input'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PageShell } from '../../../shared/ui/PageShell'
import { Spinner } from '../../../shared/ui/Spinner'
import { StatusBadge } from '../../../shared/ui/StatusBadge'
import {
  activarMfaMutation,
  actualizarPerfilMutation,
  cambiarContrasenaMutation,
  desactivarMfaMutation,
  prepararMfaMutation,
} from '../data/perfilData'

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

type PerfilForm = z.infer<typeof perfilSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export function PerfilPage() {
  const { usuario, tenant, actualizarUsuarioSesion } = useAuth()

  if (!usuario) {
    return (
      <PageShell>
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        title="Mi perfil"
        description="Gestiona tus datos personales, contrasena y segundo factor de autenticacion."
        meta={<StatusBadge status={String(usuario.rol)} label={etiquetaRol(usuario.rol)} />}
      />

      <DatosPersonales usuario={usuario} tenant={tenant} onGuardado={actualizarUsuarioSesion} />
      <CambiarContrasena usuario={usuario} />
      <Mfa usuario={usuario} onGuardado={actualizarUsuarioSesion} />
    </PageShell>
  )
}

function DatosPersonales({
  usuario,
  tenant,
  onGuardado,
}: {
  usuario: UsuarioSesion
  tenant: TenantSesion | null
  onGuardado: (usuario: UsuarioSesion) => void
}) {
  const toast = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PerfilForm>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
    },
  })

  const actualizarMutation = useMutation({
    mutationFn: actualizarPerfilMutation,
    onSuccess: (actualizado) => {
      onGuardado(actualizado)
      toast.success('Tus datos se guardaron.')
    },
  })

  async function manejarSubmit(datos: PerfilForm) {
    try {
      await actualizarMutation.mutateAsync({ id: usuario.id, datos })
    } catch {
      // El error se muestra desde la mutation.
    }
  }

  const error = getErrorMessage(actualizarMutation.error, '')

  return (
    <FormSection
      title={<span className="inline-flex items-center gap-2"><User size={20} /> Datos personales</span>}
      actions={<Button type="submit" form="perfil-form" loading={actualizarMutation.isPending} icon={<Save size={16} />}>Guardar cambios</Button>}
    >
      <form id="perfil-form" className="space-y-4" onSubmit={handleSubmit(manejarSubmit)} noValidate>
        {error && <Alert variant="error">{error}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombre" error={errors.nombre?.message} required {...register('nombre')} />
          <Input label="Apellido" error={errors.apellido?.message} required {...register('apellido')} />
          <Input className="sm:col-span-2" label="Email" type="email" error={errors.email?.message} required {...register('email')} />
        </div>

        <dl className="grid gap-3 rounded-md border border-border bg-background p-4 text-sm sm:grid-cols-2">
          <Info label="Rol" value={etiquetaRol(usuario.rol)} />
          {tenant && <Info label="Organizacion" value={tenant.nombre} />}
        </dl>
      </form>
    </FormSection>
  )
}

function CambiarContrasena({ usuario }: { usuario: UsuarioSesion }) {
  const toast = useToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { actual: '', nueva: '', repetir: '' },
  })

  const cambiarMutation = useMutation({
    mutationFn: cambiarContrasenaMutation,
    onSuccess: () => {
      toast.success('Contrasena actualizada.')
      reset()
    },
  })

  async function manejarSubmit(campos: PasswordForm) {
    try {
      await cambiarMutation.mutateAsync({ id: usuario.id, ...campos })
    } catch {
      // El error se muestra desde la mutation.
    }
  }

  const error = getErrorMessage(cambiarMutation.error, '')

  return (
    <FormSection
      title={<span className="inline-flex items-center gap-2"><Lock size={20} /> Cambiar contrasena</span>}
      actions={<Button type="submit" form="password-form" loading={cambiarMutation.isPending} icon={<RefreshCw size={16} />}>Cambiar contrasena</Button>}
    >
      <form id="password-form" className="space-y-4" onSubmit={handleSubmit(manejarSubmit)} noValidate>
        {error && <Alert variant="error">{error}</Alert>}
        <Input label="Contrasena actual" type="password" autoComplete="current-password" error={errors.actual?.message} required {...register('actual')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nueva contrasena" type="password" autoComplete="new-password" error={errors.nueva?.message} required {...register('nueva')} />
          <Input label="Repetir nueva" type="password" autoComplete="new-password" error={errors.repetir?.message} required {...register('repetir')} />
        </div>
      </form>
    </FormSection>
  )
}

function Mfa({
  usuario,
  onGuardado,
}: {
  usuario: UsuarioSesion
  onGuardado: (usuario: UsuarioSesion) => void
}) {
  const [setup, setSetup] = useState<{ secret?: string; otpAuthUri?: string } | null>(null)
  const [codigo, setCodigo] = useState('')
  const toast = useToast()

  const setupMutation = useMutation({
    mutationFn: prepararMfaMutation,
    onSuccess: (data) => setSetup(data as { secret?: string; otpAuthUri?: string }),
  })
  const activarMutation = useMutation({
    mutationFn: activarMfaMutation,
    onSuccess: () => {
      onGuardado({ ...usuario, mfaActivo: true })
      setSetup(null)
      setCodigo('')
      toast.success('MFA activado.')
    },
  })
  const desactivarMutation = useMutation({
    mutationFn: desactivarMfaMutation,
    onSuccess: () => {
      onGuardado({ ...usuario, mfaActivo: false })
      setCodigo('')
      toast.success('MFA desactivado.')
    },
  })

  async function iniciarSetup() {
    try {
      await setupMutation.mutateAsync()
    } catch {
      // El error se muestra desde la mutation.
    }
  }

  async function confirmar() {
    try {
      await activarMutation.mutateAsync({ code: codigo })
    } catch {
      // El error se muestra desde la mutation.
    }
  }

  async function desactivar() {
    try {
      await desactivarMutation.mutateAsync({ code: codigo })
    } catch {
      // El error se muestra desde la mutation.
    }
  }

  const cargando = setupMutation.isPending || activarMutation.isPending || desactivarMutation.isPending
  const error = getErrorMessage(setupMutation.error ?? activarMutation.error ?? desactivarMutation.error, '')

  return (
    <FormSection
      title={<span className="inline-flex items-center gap-2"><Shield size={20} /> Autenticacion multifactor</span>}
      actions={<StatusBadge status={usuario.mfaActivo ? 'active' : 'inactive'} label={usuario.mfaActivo ? 'Activo' : 'Inactivo'} />}
    >
      {error && <Alert variant="error">{error}</Alert>}

      {!usuario.mfaActivo && !setup && (
        <Button type="button" onClick={iniciarSetup} disabled={cargando} icon={<Smartphone size={16} />}>Activar MFA</Button>
      )}

      {!usuario.mfaActivo && setup && (
        <div className="space-y-4">
          <dl className="grid gap-3 rounded-md border border-border bg-background p-4 text-sm">
            <Info label="Secret" value={<code>{setup.secret}</code>} />
            <Info label="URI" value={<code className="break-all">{setup.otpAuthUri}</code>} />
          </dl>
          <Input label="Codigo de verificacion" value={codigo} onChange={(event) => setCodigo(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" />
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" type="button" onClick={() => setSetup(null)}>Cancelar</Button>
            <Button type="button" onClick={confirmar} disabled={cargando} icon={<CheckCircle size={16} />}>Confirmar MFA</Button>
          </div>
        </div>
      )}

      {usuario.mfaActivo && (
        <div className="space-y-4">
          <Input label="Codigo actual" value={codigo} onChange={(event) => setCodigo(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" />
          <Button variant="danger" type="button" onClick={desactivar} disabled={cargando} icon={<RotateCcw size={16} />}>Desactivar MFA</Button>
        </div>
      )}
    </FormSection>
  )
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-text">{value}</dd>
    </div>
  )
}
