import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../../auth/AuthContext'
import { ROLE_INFO, ROLES_ASIGNABLES_POR_EMPRESA } from '../../domain/roles'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Button } from '../../shared/ui/Button'
import { Checkbox } from '../../shared/ui/Checkbox'
import { FormActions } from '../../shared/ui/FormActions'
import { FormSection } from '../../shared/ui/FormSection'
import { Input } from '../../shared/ui/Input'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { Select } from '../../shared/ui/Select'
import { Spinner } from '../../shared/ui/Spinner'
import {
  actualizarUsuarioMutation,
  crearUsuarioMutation,
  obtenerUsuarioQuery,
  usuariosKeys,
} from './data/usuariosData'

const VACIO = { nombre: '', apellido: '', email: '', rol: '', activo: true }

const usuarioSchema = z.object({
  nombre: z.string().trim().min(2, 'Ingresa el nombre.'),
  apellido: z.string().trim().min(2, 'Ingresa el apellido.'),
  email: z.string().trim().email('Ingresa un email valido.'),
  rol: z.string().min(1, 'Elegi un rol.'),
  activo: z.boolean(),
})

export function UsuarioFormPage() {
  const { id } = useParams()
  const esEdicion = Boolean(id)
  const { tenantId } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(usuarioSchema),
    defaultValues: VACIO,
  })
  const rolSeleccionado = useWatch({ control, name: 'rol' })

  const usuarioQuery = useQuery({
    queryKey: usuariosKeys.detail(tenantId, id),
    queryFn: () => obtenerUsuarioQuery({ tenantId, id }),
    enabled: Boolean(esEdicion && tenantId && id),
  })

  const crearMutation = useMutation({
    mutationFn: crearUsuarioMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usuariosKeys.lists() })
    },
  })

  const actualizarMutation = useMutation({
    mutationFn: actualizarUsuarioMutation,
    onSuccess: async (_usuario, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: usuariosKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: usuariosKeys.detail(variables.tenantId, variables.id) }),
      ])
    },
  })

  useEffect(() => {
    if (!usuarioQuery.data) return
    reset({
      nombre: usuarioQuery.data.nombre,
      apellido: usuarioQuery.data.apellido,
      email: usuarioQuery.data.email,
      rol: usuarioQuery.data.rol,
      activo: usuarioQuery.data.activo,
    })
  }, [reset, usuarioQuery.data])

  async function manejarSubmit(datos) {
    try {
      if (esEdicion && id) {
        await actualizarMutation.mutateAsync({ tenantId, id, datos })
      } else {
        await crearMutation.mutateAsync({ tenantId, datos })
      }
      navigate('/usuarios')
    } catch {
      // El error se muestra desde la mutation.
    }
  }

  const guardando = crearMutation.isPending || actualizarMutation.isPending
  const error = getErrorMessage(usuarioQuery.error ?? crearMutation.error ?? actualizarMutation.error, '')

  const cargando = usuarioQuery.isLoading
  if (cargando) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <PageShell>
      <PageHeader title={esEdicion ? 'Editar usuario' : 'Nuevo usuario'} />

      {error && <Alert variant="error">{error}</Alert>}

      <FormSection title={esEdicion ? 'Datos del usuario' : 'Alta de usuario'}>
      <form className="space-y-5" onSubmit={handleSubmit(manejarSubmit)} noValidate>
        <Input label="Nombre" error={errors.nombre?.message} required {...register('nombre')} />
        <Input label="Apellido" error={errors.apellido?.message} required {...register('apellido')} />
        <Input
          label="Email"
          type="email"
          error={errors.email?.message}
          required
          {...register('email')}
        />

        <Select
          label="Rol"
          help={rolSeleccionado ? ROLE_INFO[rolSeleccionado].descripcion : undefined}
          error={errors.rol?.message}
          required
          {...register('rol')}
        >
          <option value="">Elegi un rol...</option>
          {ROLES_ASIGNABLES_POR_EMPRESA.map((clave) => (
            <option key={clave} value={clave}>
              {ROLE_INFO[clave].label}
            </option>
          ))}
        </Select>

        <Checkbox label="Usuario activo" {...register('activo')} />

        <FormActions>
          <Button variant="ghost" onClick={() => navigate('/usuarios')}>
            Cancelar
          </Button>
          <Button type="submit" loading={guardando}>
            Guardar
          </Button>
        </FormActions>
      </form>
      </FormSection>
    </PageShell>
  )
}
