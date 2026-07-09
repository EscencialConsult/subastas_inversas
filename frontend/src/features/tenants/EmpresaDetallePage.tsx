import { ReactNode, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Clipboard } from 'lucide-react'
import { etiquetaRol } from '../../domain/roles'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { DataTable, type DataTableColumn } from '../../shared/ui/DataTable'
import { FormSection } from '../../shared/ui/FormSection'
import { LoadingState } from '../../shared/ui/StateViews'
import { Modal } from '../../shared/ui/Modal'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { Pagination, usePagination } from '../../shared/ui/Pagination'
import { resetPasswordUsuarioMutation } from '../usuarios/data/usuariosData'
import { obtenerDetalleEmpresaQuery, tenantsKeys } from './data/tenantsData'

interface UsuarioEmpresa {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
  activo: boolean
}

interface ResetModalState {
  usuario: UsuarioEmpresa
  nuevaPass: string
}

function generarPass() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let pass = ''
  for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length))
  return pass + 'Aa1!'
}

export function EmpresaDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [resetModal, setResetModal] = useState<ResetModalState | null>(null)

  const detalleQuery = useQuery({
    queryKey: tenantsKeys.companyDetail(id),
    queryFn: () => obtenerDetalleEmpresaQuery({ id }),
    enabled: Boolean(id),
  })

  const resetMutation = useMutation({
    mutationFn: resetPasswordUsuarioMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenantsKeys.companyDetail(id) })
    },
  })

  async function manejarResetPass(usuario: UsuarioEmpresa) {
    const res = await resetMutation.mutateAsync({ userId: usuario.id, newPassword: generarPass() })
    setResetModal({ usuario, nuevaPass: res.newPassword })
  }

  const data = detalleQuery.data as unknown as { tenant: Record<string, unknown>; stats: Record<string, unknown>; usuarios: UsuarioEmpresa[] } | undefined
  const usuarios = data?.usuarios ?? []
  const { paginatedItems: usuariosPaginados, setPage: setUsuariosPage, setPageSize: setUsuariosPageSize, ...usuariosPaginacion } = usePagination(usuarios as (UsuarioEmpresa & Record<string, unknown>)[])

  if (detalleQuery.isLoading) return <LoadingState label="Cargando empresa..." />
  const error = getErrorMessage(detalleQuery.error ?? resetMutation.error, '')
  if (!data) return <Alert variant="error">{error}</Alert>

  const { tenant, stats } = data

  const usuarioColumns: Array<DataTableColumn<UsuarioEmpresa & Record<string, unknown>>> = [
    {
      header: 'Nombre',
      cell: (row) => `${row.nombre} ${row.apellido}`,
      sortValue: (row) => `${row.nombre} ${row.apellido}`,
    },
    { header: 'Email', accessor: 'email', sortable: true },
    {
      header: 'Rol',
      cell: (row) => etiquetaRol(row.rol),
    },
    {
      header: 'Estado',
      cell: (row) => (
        <Badge variant={row.activo ? 'success' : 'neutral'}>
          {row.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      header: '',
      align: 'right',
      cell: (row) => (
        <Button variant="ghost" size="sm" onClick={() => manejarResetPass(row)}>
          Resetear pass
        </Button>
      ),
    },
  ]

  return (
    <PageShell width="wide">
      <PageHeader
        title={tenant.nombre as string}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => navigate('/tenants')}>Volver</Button>
            <Button onClick={() => navigate(`/tenants/${tenant.id}`)}>Editar empresa</Button>
          </div>
        )}
      />

      <div className="grid max-w-xl gap-2 rounded-md border border-border bg-surface p-4 text-sm text-text">
        <span>Subdominio: <code>{tenant.subdominio as string}</code>.sicst.gob.ar</span>
        <span>
          Estado:{' '}
          <Badge variant={tenant.activo ? 'success' : 'neutral'}>
            {tenant.activo ? 'Activa' : 'Inactiva'}
          </Badge>
        </span>
      </div>

      <section className="grid gap-3 md:grid-cols-5">
        <Metric label="Usuarios" value={stats.usuarios as number} tone="primary" />
        <Metric label="Activos" value={stats.activos as number} tone="success" />
        <Metric label="Procesos de compra" value={stats.procesos as number} tone="primary" />
        <Metric label="Subastas" value={stats.subastas as number} tone="warning" />
        <Metric label="Ahorro promedio" value={stats.ahorroProm === null ? '-' : `${stats.ahorroProm as number}%`} tone="success" />
      </section>

      <FormSection title="Usuarios de la empresa">
        <DataTable
          columns={usuarioColumns}
          rows={usuariosPaginados}
          getRowId={(row) => row.id}
          emptyTitle="Sin usuarios"
          emptyDescription="Este tenant no tiene usuarios."
        />
        <Pagination {...usuariosPaginacion} onPageChange={setUsuariosPage} onPageSizeChange={setUsuariosPageSize} />
      </FormSection>

      <Modal
        open={Boolean(resetModal)}
        onClose={() => setResetModal(null)}
        title="Contraseña restablecida"
        footer={<Button onClick={() => setResetModal(null)}>Entendido, cerrar</Button>}
      >
        {resetModal && (
          <div className="space-y-4">
            <p>
              Se restableció la contraseña de <strong>{resetModal.usuario.nombre} {resetModal.usuario.apellido}</strong> ({resetModal.usuario.email}).
            </p>
            <Alert variant="info"><strong>Nueva contraseña temporal:</strong></Alert>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-4 py-3">
              <code>{resetModal.nuevaPass}</code>
              <Button
                type="button"
                variant="ghost"
                title="Copiar contraseña"
                onClick={() => navigator.clipboard.writeText(resetModal.nuevaPass)}
              >
                <Clipboard size={16} />
              </Button>
            </div>
            <p className="text-sm text-text-muted">
              El usuario deberá cambiar esta contraseña al iniciar sesión. Copiala ahora antes de cerrar.
            </p>
          </div>
        )}
      </Modal>
    </PageShell>
  )
}

function Metric({ label, value, tone }: { label: string; value: ReactNode; tone: string }) {
  const tones: Record<string, string> = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
  }

  return (
    <article className="rounded-md border border-border bg-surface p-4 shadow-sm">
      <span className={['block text-xl font-semibold', tones[tone] ?? 'text-text'].join(' ')}>{value}</span>
      <span className="text-sm text-text-muted">{label}</span>
    </article>
  )
}
