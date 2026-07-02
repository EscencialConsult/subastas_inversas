import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../../auth/AuthContext'
import { obtenerUsuario, crearUsuario, actualizarUsuario } from '../../shared/api/usersApi'
import { ROLE_INFO, ROLES_ASIGNABLES_POR_EMPRESA } from '../../domain/roles'
import { Alert } from '../../shared/ui/Alert'
import { Button } from '../../shared/ui/Button'
import { Checkbox } from '../../shared/ui/Checkbox.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { Spinner } from '../../shared/ui/Spinner.jsx'

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
  const [cargando, setCargando] = useState(esEdicion)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
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

  useEffect(() => {
    if (!esEdicion) return
    obtenerUsuario({ tenantId, id })
      .then((u) =>
        reset({
          nombre: u.nombre,
          apellido: u.apellido,
          email: u.email,
          rol: u.rol,
          activo: u.activo,
        }),
      )
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [esEdicion, tenantId, id, reset])

  async function manejarSubmit(datos) {
    setError('')
    setGuardando(true)
    try {
      if (esEdicion) {
        await actualizarUsuario({ tenantId, id, datos })
      } else {
        await crearUsuario({ tenantId, datos })
      }
      navigate('/usuarios')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <section className="form-pagina">
      <div className="encabezado">
        <h1>{esEdicion ? 'Editar usuario' : 'Nuevo usuario'}</h1>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <form className="form" onSubmit={handleSubmit(manejarSubmit)} noValidate>
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

        <div className="form__acciones">
          <Button variant="ghost" onClick={() => navigate('/usuarios')}>
            Cancelar
          </Button>
          <Button type="submit" loading={guardando}>
            Guardar
          </Button>
        </div>
      </form>
    </section>
  )
}
