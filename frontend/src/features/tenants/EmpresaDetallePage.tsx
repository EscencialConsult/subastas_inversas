// Detalle de una empresa (solo super-admin): datos + actividad + sus usuarios.

import { ReactNode, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Clipboard, SearchX } from 'lucide-react'
import { EmptyState } from '../../shared/ui/EmptyState'
import { etiquetaRol } from '../../domain/roles'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { LoadingState } from '../../shared/ui/StateViews'
import { Modal } from '../../shared/ui/Modal'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { resetPasswordUsuarioMutation } from '../usuarios/data/usuariosData'
import { obtenerDetalleEmpresaQuery, tenantsKeys } from './data/tenantsData'

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
  const [resetModal, setResetModal] = useState(null)

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

  async function manejarResetPass(usuario) {
    const res = await resetMutation.mutateAsync({ userId: usuario.id, newPassword: generarPass() })
    setResetModal({ usuario, nuevaPass: res.newPassword })
  }

  if (detalleQuery.isLoading) return <LoadingState label="Cargando empresa..." />
  const error = getErrorMessage(detalleQuery.error ?? resetMutation.error, '')
  const data = detalleQuery.data
  if (!data) return <Alert variant="error">{error}</Alert>

  const { tenant, stats, usuarios } = data

  return (
    <PageShell width="wide">
      <PageHeader
        title={tenant.nombre}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => navigate('/tenants')}>Volver</Button>
            <Button onClick={() => navigate(`/tenants/${tenant.id}`)}>Editar empresa</Button>
          </div>
        )}
      />

      <div className="grid max-w-xl gap-2 rounded-md border border-border bg-surface p-4 text-sm text-text">
        <span>Subdominio: <code>{tenant.subdominio}</code>.sicst.gob.ar</span>
        <span>
          Estado:{' '}
          <Badge variant={tenant.activo ? 'success' : 'neutral'}>
            {tenant.activo ? 'Activa' : 'Inactiva'}
          </Badge>
        </span>
      </div>

      <section className="grid gap-3 md:grid-cols-5">
        <Metric label="Usuarios" value={stats.usuarios} tone="primary" />
        <Metric label="Activos" value={stats.activos} tone="success" />
        <Metric label="Procesos de compra" value={stats.procesos} tone="primary" />
        <Metric label="Subastas" value={stats.subastas} tone="warning" />
        <Metric label="Ahorro promedio" value={stats.ahorroProm === null ? '-' : `${stats.ahorroProm}%`} tone="success" />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text">Usuarios de la empresa</h2>
        {usuarios.length === 0 ? (
          <EmptyState icon={SearchX} title="Sin usuarios" description="Este tenant no tiene usuarios." />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-sm">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium text-text">{u.nombre} {u.apellido}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{etiquetaRol(u.rol)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.activo ? 'success' : 'neutral'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" onClick={() => manejarResetPass(u)}>Resetear pass</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={Boolean(resetModal)}
        onClose={() => setResetModal(null)}
        title="Contrasena restablecida"
        footer={<Button onClick={() => setResetModal(null)}>Entendido, cerrar</Button>}
      >
        {resetModal && (
          <div className="space-y-4">
            <p>
              Se restablecio la contrasena de <strong>{resetModal.usuario.nombre} {resetModal.usuario.apellido}</strong> ({resetModal.usuario.email}).
            </p>
            <Alert variant="info"><strong>Nueva contrasena temporal:</strong></Alert>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-4 py-3">
              <code>{resetModal.nuevaPass}</code>
              <Button
                type="button"
                variant="ghost"
                title="Copiar contrasena"
                onClick={() => navigator.clipboard.writeText(resetModal.nuevaPass)}
              >
                <Clipboard size={16} />
              </Button>
            </div>
            <p className="text-sm text-text-muted">
              El usuario debera cambiar esta contrasena al iniciar sesion. Copiala ahora antes de cerrar.
            </p>
          </div>
        )}
      </Modal>
    </PageShell>
  )
}

function Metric({ label, value, tone }: { label: string; value: ReactNode; tone: string }) {
  const tones = {
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
