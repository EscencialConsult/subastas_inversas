// Directorio de proveedores compartido entre empresas.

import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../context/ToastContext.jsx'
import {
  habilitarProveedorEmpresa,
  listarProveedores,
  listarProveedoresParaAuditoria,
} from '../../api/proveedoresApi'
import { invitarProveedorAProceso, listarProcesos } from '../../api/comprasApi'
import { ESTADO_PROCESO } from '../../domain/compras'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { Select } from '../../components/ui/Select.jsx'
import { Spinner } from '../../components/ui/Spinner.jsx'
import { Table } from '../../components/ui/Table.jsx'

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
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [procesandoId, setProcesandoId] = useState(null)
  const [invitandoId, setInvitandoId] = useState(null)
  const [procesosInvitables, setProcesosInvitables] = useState([])
  const [procesoSeleccionadoId, setProcesoSeleccionadoId] = useState('')
  const [error, setError] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const [rubro, setRubro] = useState('')
  const [provincia, setProvincia] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [cercania, setCercania] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const listar = rol === 'auditor' ? listarProveedoresParaAuditoria : listarProveedores
      const lista = await listar({
        busqueda,
        estado,
        rubro,
        provincia,
        localidad,
        cercania,
        tenantId,
      })
      setProveedores(lista)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(cargar, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, estado, rubro, provincia, localidad, cercania, tenantId, rol])

  useEffect(() => {
    if (!tenantId || rol !== 'comprador') return

    listarProcesos({ tenantId })
      .then((procesos) => {
        const invitables = procesos.filter((proceso) => proceso.estado === ESTADO_PROCESO.PUBLICADO)
        setProcesosInvitables(invitables)
        setProcesoSeleccionadoId((actual) => actual || invitables[0]?.id || '')
      })
      .catch((err) => setError(err.message))
  }, [tenantId, rol])

  async function habilitar(proveedorId) {
    if (!tenantId) return

    setProcesandoId(proveedorId)
    setError('')
    try {
      const resultado = await habilitarProveedorEmpresa({ tenantId, proveedorId })
      setProveedores((actual) =>
        actual.map((proveedor) =>
          proveedor.id === proveedorId
            ? {
                ...proveedor,
                estadoEmpresa: resultado.estadoEmpresa,
                advertenciaEmpresa: resultado.advertenciaEmpresa,
                politicaEstricta: resultado.politicaEstricta,
              }
            : proveedor,
        ),
      )
      toast.success('Proveedor evaluado para tu empresa.')
    } catch (err) {
      setError(err.message)
    } finally {
      setProcesandoId(null)
    }
  }

  async function invitar(proveedorId) {
    if (!tenantId || !procesoSeleccionadoId) return

    setInvitandoId(proveedorId)
    setError('')
    try {
      await invitarProveedorAProceso({
        tenantId,
        procesoId: procesoSeleccionadoId,
        proveedorId,
      })
      toast.success('Invitacion enviada al proveedor.')
    } catch (err) {
      setError(err.message)
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

      {cargando ? (
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
