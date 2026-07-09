import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Building2, CheckCircle, Clipboard, Globe, Image, Palette, ShieldCheck } from 'lucide-react'
import { type TenantAdminInput, type TenantInput } from '../../../shared/api/tenantsApi'
import { getErrorMessage } from '../../../shared/query/queryClient'
import { Alert } from '../../../shared/ui/Alert'
import { Button } from '../../../shared/ui/Button'
import { FormSection } from '../../../shared/ui/FormSection'
import { Input } from '../../../shared/ui/Input'
import { LoadingState } from '../../../shared/ui/StateViews'
import { Modal } from '../../../shared/ui/Modal'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PageShell } from '../../../shared/ui/PageShell'
import {
  actualizarTenantMutation,
  crearTenantMutation,
  obtenerTenantQuery,
  tenantsKeys,
} from '../data/tenantsData'

const COLOR_PRIMARIO_DEFAULT = '#1d4ed8'
const VACIO: TenantInput = {
  nombre: '',
  subdominio: '',
  logo: '',
  colorPrimario: COLOR_PRIMARIO_DEFAULT,
  activo: true,
}
const ADMIN_VACIO: TenantAdminInput = { nombre: '', apellido: '', email: '' }

type TenantFormErrors = Partial<Record<'nombre' | 'subdominio' | 'nombreAdmin' | 'apellidoAdmin' | 'emailAdmin', string>>
type CreacionExitosa = {
  tenant: TenantInput & { id: string }
  passwordTemporal: string
  admin: TenantAdminInput
} | null

export function TenantFormPage() {
  const { id } = useParams()
  const esEdicion = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [datos, setDatos] = useState<TenantInput>(VACIO)
  const [admin, setAdmin] = useState<TenantAdminInput>(ADMIN_VACIO)
  const [errores, setErrores] = useState<TenantFormErrors>({})
  const [subdominioEditado, setSubdominioEditado] = useState(false)
  const [creacionExitosa, setCreacionExitosa] = useState<CreacionExitosa>(null)

  const tenantQuery = useQuery({
    queryKey: tenantsKeys.detail(id),
    queryFn: () => obtenerTenantQuery({ id }),
    enabled: Boolean(esEdicion && id),
  })

  const crearMutation = useMutation({
    mutationFn: crearTenantMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenantsKeys.lists() })
    },
  })

  const actualizarMutation = useMutation({
    mutationFn: actualizarTenantMutation,
    onSuccess: async (_tenant, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tenantsKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: tenantsKeys.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: tenantsKeys.companyDetail(variables.id) }),
      ])
    },
  })

  const [formInited, setFormInited] = useState(false)
  if (tenantQuery.data && !formInited) {
    setFormInited(true)
    setDatos({
      nombre: tenantQuery.data.nombre,
      subdominio: tenantQuery.data.subdominio,
      logo: tenantQuery.data.logo ?? '',
      colorPrimario: tenantQuery.data.colorPrimario || COLOR_PRIMARIO_DEFAULT,
      activo: tenantQuery.data.activo,
    })
  }

  function actualizarCampo(campo: keyof TenantInput, valor: string | boolean) {
    setDatos((prev) => ({ ...prev, [campo]: valor }))
    if (campo === 'nombre' || campo === 'subdominio') {
      if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: '' }))
    }
  }

  function cambiarNombre(valor: string) {
    setDatos((prev) => ({
      ...prev,
      nombre: valor,
      subdominio: subdominioEditado ? prev.subdominio : aSubdominio(valor),
    }))
    if (errores.nombre) setErrores((prev) => ({ ...prev, nombre: '' }))
  }

  function cambiarSubdominio(valor: string) {
    setSubdominioEditado(true)
    const limpio = valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
    setDatos((prev) => ({ ...prev, subdominio: limpio }))
    if (errores.subdominio) setErrores((prev) => ({ ...prev, subdominio: '' }))
  }

  function actualizarAdmin(campo: keyof TenantAdminInput, valor: string) {
    setAdmin((prev) => ({ ...prev, [campo]: valor }))
    const errorKey = `${campo}Admin` as keyof TenantFormErrors
    if (errores[errorKey]) setErrores((prev) => ({ ...prev, [errorKey]: '' }))
  }

  function validar() {
    const errs: TenantFormErrors = {}
    if (!datos.nombre.trim()) errs.nombre = 'El nombre es obligatorio'
    if (!datos.subdominio.trim()) errs.subdominio = 'El subdominio es obligatorio'
    if (!esEdicion) {
      if (!admin.nombre.trim()) errs.nombreAdmin = 'El nombre del admin es obligatorio'
      if (!admin.apellido.trim()) errs.apellidoAdmin = 'El apellido del admin es obligatorio'
      if (!admin.email.trim()) errs.emailAdmin = 'El email del admin es obligatorio'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email.trim())) errs.emailAdmin = 'Email invalido'
    }
    setErrores(errs)
    return Object.keys(errs).length === 0
  }

  async function manejarSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validar()) return
    try {
      if (esEdicion && id) {
        await actualizarMutation.mutateAsync({ id, datos })
        navigate('/tenants')
      } else {
        setCreacionExitosa(await crearMutation.mutateAsync({ datos, admin }) as CreacionExitosa)
      }
    } catch {
      // El error se muestra desde la mutation.
    }
  }

  function cerrarModal() {
    setCreacionExitosa(null)
    navigate('/tenants')
  }

  const guardando = crearMutation.isPending || actualizarMutation.isPending
  const error = getErrorMessage(tenantQuery.error ?? crearMutation.error ?? actualizarMutation.error, '')

  if (tenantQuery.isLoading) return <LoadingState label="Cargando empresa..." />

  return (
    <PageShell>
      <PageHeader
        title={esEdicion ? 'Editar empresa' : 'Nueva empresa'}
        description={esEdicion ? 'Actualiza identidad y estado del tenant.' : 'Crea una empresa y su administrador inicial.'}
      />

      {error && <Alert variant="error">{error}</Alert>}

      <form className="space-y-6" onSubmit={manejarSubmit} noValidate>
        <FormSection title={<span className="inline-flex items-center gap-2"><Building2 size={20} /> Datos de la empresa</span>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nombre de la organizacion" value={datos.nombre} onChange={(event) => cambiarNombre(event.target.value)} error={errores.nombre} required placeholder="Municipio de San Miguel de Tucuman" fieldClassName="sm:col-span-2" />
            <Input label={<span className="inline-flex items-center gap-2"><Globe size={14} /> Subdominio</span>} value={datos.subdominio} onChange={(event) => cambiarSubdominio(event.target.value)} error={errores.subdominio} required placeholder="tucuman" help={`Direccion del tenant: ${datos.subdominio || 'subdominio'}.sicstmax.com`} fieldClassName="sm:col-span-2" />
            <Input type="url" label={<span className="inline-flex items-center gap-2"><Image size={14} /> Logo</span>} value={datos.logo} onChange={(event) => actualizarCampo('logo', event.target.value)} placeholder="https://empresa.com/logo.png" help="URL publica del logo" />
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-text"><Palette size={14} /> Color primario</label>
              <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-2">
                <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(datos.colorPrimario ?? '') ? datos.colorPrimario : COLOR_PRIMARIO_DEFAULT} onChange={(event) => actualizarCampo('colorPrimario', event.target.value)} aria-label="Seleccionar color primario" className="h-11 w-12 rounded-md border border-border bg-surface p-1" />
                <input value={datos.colorPrimario} onChange={(event) => actualizarCampo('colorPrimario', event.target.value)} placeholder="#1d4ed8" maxLength={20} className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:shadow-focus" />
              </div>
            </div>
            <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-3 text-sm font-medium text-text sm:col-span-2">
              <input type="checkbox" checked={datos.activo} onChange={(event) => actualizarCampo('activo', event.target.checked)} />
              Tenant activo
            </label>
          </div>
        </FormSection>

        {!esEdicion && (
          <FormSection
            title={<span className="inline-flex items-center gap-2"><ShieldCheck size={20} /> Administrador inicial</span>}
            description="Esta persona sera el administrador de la empresa y recibira un acceso temporario."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nombre" value={admin.nombre} onChange={(event) => actualizarAdmin('nombre', event.target.value)} error={errores.nombreAdmin} required placeholder="Juan" />
              <Input label="Apellido" value={admin.apellido} onChange={(event) => actualizarAdmin('apellido', event.target.value)} error={errores.apellidoAdmin} required placeholder="Perez" />
              <Input type="email" label="Email" value={admin.email} onChange={(event) => actualizarAdmin('email', event.target.value)} error={errores.emailAdmin} required placeholder="admin@empresa.com" fieldClassName="sm:col-span-2" />
            </div>
          </FormSection>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate('/tenants')}>Cancelar</Button>
          <Button type="submit" loading={guardando} icon={<CheckCircle size={16} />}>{esEdicion ? 'Guardar cambios' : 'Crear empresa'}</Button>
        </div>
      </form>

      <Modal
        open={Boolean(creacionExitosa)}
        onClose={cerrarModal}
        title="Empresa creada"
        footer={<Button onClick={cerrarModal} icon={<CheckCircle size={16} />}>Entendido, cerrar</Button>}
      >
        {creacionExitosa && (
          <div className="space-y-4">
            <p>Se creo la organizacion <strong>{creacionExitosa.tenant.nombre}</strong> con administrador <strong>{creacionExitosa.admin.nombre} {creacionExitosa.admin.apellido}</strong>.</p>
            <Alert variant="info"><strong>Contrasena temporal del administrador:</strong></Alert>
            <div className="flex items-center gap-2 rounded-md border border-border bg-background p-3">
              <code className="flex-1 text-lg font-bold tracking-wide">{creacionExitosa.passwordTemporal}</code>
              <Button type="button" variant="ghost" icon={<Clipboard size={16} />} title="Copiar contrasena" onClick={() => navigator.clipboard.writeText(creacionExitosa.passwordTemporal)} />
            </div>
            <p className="text-sm text-text-muted">Esta contrasena se muestra una sola vez. Copiala ahora antes de cerrar.</p>
          </div>
        )}
      </Modal>
    </PageShell>
  )
}

function aSubdominio(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
