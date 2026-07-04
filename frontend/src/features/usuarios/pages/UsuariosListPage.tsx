// Listado de usuarios del tenant, con buscador y filtros.

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Clipboard } from 'lucide-react'
import { useAuth } from '../../../auth/AuthContext'
import type { Usuario } from '../../../domain/entities'
import { ROLE_INFO, etiquetaRol } from '../../../domain/roles'
import { getErrorMessage } from '../../../shared/query/queryClient'
import { Alert } from '../../../shared/ui/Alert'
import { Button } from '../../../shared/ui/Button'
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable'
import { FormSection } from '../../../shared/ui/FormSection'
import { Modal } from '../../../shared/ui/Modal'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PageShell } from '../../../shared/ui/PageShell'
import { StatusBadge } from '../../../shared/ui/StatusBadge'
import {
  cambiarEstadoUsuarioMutation,
  listarUsuariosQuery,
  resetPasswordUsuarioMutation,
  usuariosKeys,
  type UsuariosListParams,
} from '../data/usuariosData'

type ResetModalState = { usuario: Usuario; nuevaPass: string } | null
type UsuarioRow = Usuario & Record<string, unknown>

export function UsuariosListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [resetModal, setResetModal] = useState<ResetModalState>(null)
  const [busqueda, setBusqueda] = useState('')
  const [rol, setRol] = useState('')
  const [estado, setEstado] = useState('')

  const filtros: UsuariosListParams = {
    tenantId,
    busqueda,
    rol,
    soloActivos: estado === '' ? null : estado === 'activos',
  }

  const usuariosQuery = useQuery({
    queryKey: usuariosKeys.list(filtros),
    queryFn: () => listarUsuariosQuery(filtros),
    enabled: Boolean(tenantId),
    placeholderData: (previousData) => previousData,
  })

  const cambiarEstadoMutation = useMutation({
    mutationFn: cambiarEstadoUsuarioMutation,
    onMutate: async ({ id, activo }) => {
      await queryClient.cancelQueries({ queryKey: usuariosKeys.lists() })
      const snapshots = queryClient.getQueriesData<Usuario[]>({ queryKey: usuariosKeys.lists() })
      snapshots.forEach(([key, data]) => {
        if (!data) return
        queryClient.setQueryData<Usuario[]>(key, data.map((usuario) => (usuario.id === id ? { ...usuario, activo } : usuario)))
      })
      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: usuariosKeys.lists() })
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: resetPasswordUsuarioMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usuariosKeys.lists() })
    },
  })

  function alternarEstado(usuario: Usuario) {
    if (!tenantId) return
    cambiarEstadoMutation.mutate({ tenantId, id: usuario.id, activo: !usuario.activo })
  }

  async function manejarResetPass(usuario: Usuario) {
    const nuevaPass = generarPass()
    const res = await resetPasswordMutation.mutateAsync({ userId: usuario.id, newPassword: nuevaPass })
    setResetModal({ usuario, nuevaPass: res.newPassword })
  }

  const usuarios = usuariosQuery.data ?? []
  const error = getErrorMessage(cambiarEstadoMutation.error ?? resetPasswordMutation.error ?? usuariosQuery.error, '')

  const columns: Array<DataTableColumn<UsuarioRow>> = [
    {
      header: 'Nombre',
      sortValue: (row) => `${row.nombre} ${row.apellido}`,
      cell: (row) => `${row.nombre} ${row.apellido}`,
    },
    { header: 'Email', accessor: 'email', sortable: true },
    {
      header: 'Rol',
      sortValue: (row) => etiquetaRol(row.rol),
      cell: (row) => etiquetaRol(row.rol),
    },
    {
      header: 'Estado',
      cell: (row) => <StatusBadge status={row.activo ? 'active' : 'inactive'} label={row.activo ? 'Activo' : 'Inactivo'} />,
    },
    {
      header: '',
      align: 'right',
      cell: (row) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/usuarios/${row.id}`)}>Editar</Button>
          <Button variant="ghost" size="sm" onClick={() => alternarEstado(row)}>{row.activo ? 'Desactivar' : 'Activar'}</Button>
          <Button variant="danger" size="sm" onClick={() => manejarResetPass(row)}>Resetear pass</Button>
        </div>
      ),
    },
  ]

  if (!tenantId) {
    return (
      <PageShell>
        <PageHeader title="Usuarios" />
        <Alert variant="info">
          Selecciona una empresa desde <Button variant="link" onClick={() => navigate('/tenants')}>Tenants</Button> y luego ingresa a su detalle para administrar sus usuarios.
        </Alert>
      </PageShell>
    )
  }

  return (
    <PageShell width="wide">
      <PageHeader title="Usuarios" actions={<Button onClick={() => navigate('/usuarios/nuevo')}>Nuevo usuario</Button>} />

      <FormSection title="Filtros">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px]">
          <input className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:shadow-focus" placeholder="Buscar por nombre o email..." value={busqueda} onChange={(event) => setBusqueda(event.target.value)} />
          <select className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:shadow-focus" value={rol} onChange={(event) => setRol(event.target.value)}>
            <option value="">Todos los roles</option>
            {Object.entries(ROLE_INFO).map(([clave, info]) => (
              <option key={clave} value={clave}>{info.label}</option>
            ))}
          </select>
          <select className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:shadow-focus" value={estado} onChange={(event) => setEstado(event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </div>
      </FormSection>

      {error && <Alert variant="error">{error}</Alert>}

      <DataTable
        columns={columns}
        rows={usuarios as UsuarioRow[]}
        loading={usuariosQuery.isLoading || usuariosQuery.isFetching}
        getRowId={(row) => row.id}
        pageSize={10}
        emptyTitle="Sin resultados"
        emptyDescription="No hay usuarios que coincidan con el filtro."
      />

      <Modal
        open={!!resetModal}
        onClose={() => setResetModal(null)}
        title="Contrasena restablecida"
        footer={<Button onClick={() => setResetModal(null)}>Entendido, cerrar</Button>}
      >
        <div className="space-y-4">
          <p>
            Se restablecio la contrasena de <strong>{resetModal?.usuario.nombre} {resetModal?.usuario.apellido}</strong> ({resetModal?.usuario.email}).
          </p>
          <div className="flex items-center gap-2 rounded-md border border-border bg-background p-3">
            <code className="flex-1 text-lg font-bold tracking-wide">{resetModal?.nuevaPass}</code>
            <Button type="button" variant="ghost" icon={<Clipboard size={16} />} title="Copiar contrasena" onClick={() => navigator.clipboard.writeText(resetModal?.nuevaPass ?? '')} />
          </div>
          <p className="text-xs text-text-muted">El usuario debera cambiar esta contrasena al iniciar sesion. Copiala ahora antes de cerrar.</p>
        </div>
      </Modal>
    </PageShell>
  )
}

function generarPass() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let pass = ''
  for (let i = 0; i < 12; i += 1) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `${pass}Aa1!`
}
