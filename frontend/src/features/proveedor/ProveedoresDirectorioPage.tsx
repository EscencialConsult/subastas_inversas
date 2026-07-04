// Directorio de proveedores compartido entre empresas.

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../context/ToastContext'
import { invitarProveedorAProcesoMutation, listarProcesosInvitablesQuery, procesosKeys } from '../compras/data/procesosData'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { EmptyState } from '../../shared/ui/EmptyState'
import { Input } from '../../shared/ui/Input'
import { Select } from '../../shared/ui/Select'
import { Spinner } from '../../shared/ui/Spinner'
import { Table } from '../../shared/ui/Table'
import { habilitarProveedorEmpresaMutation, listarProveedoresAuditoriaQuery, listarProveedoresQuery, proveedoresKeys } from './data/proveedoresData'

const ESTADO = {
  verificado: { texto: 'Verificado', variant: 'success' },
  pendiente: { texto: 'Pendiente', variant: 'warning' },
}

const ESTADO_EMPRESA = {
  sin_habilitar: { texto: 'Sin habilitar', variant: 'neutral' },
  habilitado: { texto: 'Habilitado', variant: 'success' },
  habilitado_con_alerta: { texto: 'Habilitado con alerta', variant: 'warning' },
  bloqueado: { texto: 'Bloqueado', variant: 'error' },
}

export function ProveedoresDirectorioPage() {
  const { rol, tenantId } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [procesandoId, setProcesandoId] = useState(null)
  const [invitandoId, setInvitandoId] = useState(null)
  const [procesoSeleccionadoId, setProcesoSeleccionadoId] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const [rubro, setRubro] = useState('')
  const [provincia, setProvincia] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [cercania, setCercania] = useState('')

  const filtros = { busqueda, estado, rubro, provincia, localidad, cercania, tenantId }
  const proveedoresQuery = useQuery({
    queryKey: [...proveedoresKeys.list(filtros), rol === 'auditor' ? 'auditoria' : 'directorio'],
    queryFn: () => rol === 'auditor' ? listarProveedoresAuditoriaQuery(filtros) : listarProveedoresQuery(filtros),
    enabled: Boolean(tenantId),
    placeholderData: (previousData) => previousData,
  })

  const procesosInvitablesQuery = useQuery({
    queryKey: procesosKeys.invitables(tenantId),
    queryFn: () => listarProcesosInvitablesQuery({ tenantId }),
    enabled: Boolean(tenantId && rol === 'comprador'),
  })

  const habilitarMutation = useMutation({
    mutationFn: habilitarProveedorEmpresaMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: proveedoresKeys.lists() })
      toast.success('Proveedor evaluado para tu empresa.')
    },
  })

  const invitarMutation = useMutation({
    mutationFn: invitarProveedorAProcesoMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: procesosKeys.invitables(tenantId) })
      toast.success('Invitacion enviada al proveedor.')
    },
  })

  const proveedores = proveedoresQuery.data ?? []
  const procesosInvitables = procesosInvitablesQuery.data ?? []
  const error = getErrorMessage(proveedoresQuery.error ?? procesosInvitablesQuery.error ?? habilitarMutation.error ?? invitarMutation.error, '')

  useEffect(() => {
    if (!procesoSeleccionadoId && procesosInvitables[0]?.id) setProcesoSeleccionadoId(procesosInvitables[0].id)
  }, [procesoSeleccionadoId, procesosInvitables])

  async function habilitar(proveedorId) {
    if (!tenantId) return

    setProcesandoId(proveedorId)
    try {
      await habilitarMutation.mutateAsync({ tenantId, proveedorId })
    } catch {
      // El error se muestra desde la mutation.
    } finally {
      setProcesandoId(null)
    }
  }

  async function invitar(proveedorId) {
    if (!tenantId || !procesoSeleccionadoId) return

    setInvitandoId(proveedorId)
    try {
      await invitarMutation.mutateAsync({
        tenantId,
        procesoId: procesoSeleccionadoId,
        proveedorId,
      })
    } catch {
      // El error se muestra desde la mutation.
    } finally {
      setInvitandoId(null)
    }
  }

  const columns = [
    { header: 'Razon social', accessor: 'razonSocial' },
    { header: 'CUIT', accessor: 'cuit', render: (valor) => <code>{valor}</code> },
    { header: 'Rubro', accessor: 'rubro' },
    { header: 'Provincia', accessor: 'provincia' },
    {
      header: 'Estado',
      accessor: 'estado',
      render: (valor) => {
        const estadoProveedor = ESTADO[valor] ?? ESTADO.pendiente
        return <Badge variant={estadoProveedor.variant}>{estadoProveedor.texto}</Badge>
      },
    },
    {
      header: 'Habilitacion',
      accessor: 'estadoEmpresa',
      render: (valor, proveedor) => {
        const estadoEmpresa = ESTADO_EMPRESA[valor] ?? ESTADO_EMPRESA.sin_habilitar
        return (
          <div className="flex flex-col gap-1">
            <Badge variant={estadoEmpresa.variant}>{estadoEmpresa.texto}</Badge>
            {proveedor.advertenciaEmpresa && (
              <small className="text-xs text-text-muted">{proveedor.advertenciaEmpresa}</small>
            )}
          </div>
        )
      },
    },
    {
      header: '',
      accessor: 'acciones',
      sortKey: false,
      render: (_, proveedor) => {
        const puedeGestionarHabilitacion = rol === 'comprador' || rol === 'administrador'
        const requiereHabilitacion =
          proveedor.estadoEmpresa === 'sin_habilitar' || proveedor.estadoEmpresa === 'bloqueado'

        if (!tenantId) return null

        return (
          <div className="flex flex-wrap justify-end gap-2">
            {puedeGestionarHabilitacion && requiereHabilitacion && (
              <Button
                variant="ghost"
                type="button"
                onClick={() => habilitar(proveedor.id)}
                disabled={procesandoId === proveedor.id}
              >
                {procesandoId === proveedor.id ? 'Evaluando...' : 'Habilitar'}
              </Button>
            )}
            {rol === 'comprador' && (
              <Button
                variant="ghost"
                type="button"
                onClick={() => invitar(proveedor.id)}
                disabled={
                  invitandoId === proveedor.id ||
                  !procesoSeleccionadoId ||
                  proveedor.estadoEmpresa === 'sin_habilitar' ||
                  proveedor.estadoEmpresa === 'bloqueado'
                }
              >
                {invitandoId === proveedor.id ? 'Invitando...' : 'Invitar'}
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <section>
      <div className="encabezado">
        <h1>Proveedores</h1>
      </div>

      <Alert variant="info">
        Red de proveedores compartida: un proveedor se registra una vez y queda disponible para todas las empresas.
      </Alert>

      <div className="filtros">
        <Input
          className="filtros__busqueda"
          placeholder="Buscar por razon social, CUIT, rubro o provincia..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="verificado">Verificado</option>
          <option value="pendiente">Pendiente</option>
        </Select>
        <Input placeholder="Rubro" value={rubro} onChange={(e) => setRubro(e.target.value)} />
        <Input placeholder="Provincia" value={provincia} onChange={(e) => setProvincia(e.target.value)} />
        <Input placeholder="Localidad" value={localidad} onChange={(e) => setLocalidad(e.target.value)} />
        <Select value={cercania} onChange={(e) => setCercania(e.target.value)}>
          <option value="">Cercania</option>
          <option value="sameProvince">Misma provincia</option>
          <option value="sameLocality">Misma localidad</option>
        </Select>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {rol === 'comprador' && (
        <Card hover={false} className="mb-4">
          <h2 className="text-base font-semibold text-text m-0">Invitar a proceso</h2>
          {procesosInvitables.length === 0 ? (
            <p className="text-sm text-text-muted mt-2 mb-0">Publica un proceso de compra antes de invitar proveedores.</p>
          ) : (
            <Select
              label="Proceso publicado"
              value={procesoSeleccionadoId}
              onChange={(e) => setProcesoSeleccionadoId(e.target.value)}
              fieldClassName="mt-4 mb-0"
            >
              {procesosInvitables.map((proceso) => (
                <option key={proceso.id} value={proceso.id}>
                  {proceso.codigo} - {proceso.titulo}
                </option>
              ))}
            </Select>
          )}
        </Card>
      )}

      {proveedoresQuery.isLoading || proveedoresQuery.isFetching ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : proveedores.length === 0 ? (
        <EmptyState icon={Users} title="Sin proveedores" description="No hay proveedores que coincidan con el filtro." />
      ) : (
        <Table data={proveedores} columns={columns} pageSize={10} />
      )}

      {rol === 'comprador' && (
        <p className="text-xs text-text-muted mt-3">
          Para invitar, el proveedor debe estar habilitado o habilitado con alerta para tu empresa.
        </p>
      )}
    </section>
  )
}
