import { useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, CircleAlert, FileCheck2, FileClock, ShieldCheck, Users } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useConfirm } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
import { ROLES } from '../../domain/roles'
import { invitarProveedorAProcesoMutation, listarProcesosInvitablesQuery, procesosKeys } from '../compras/data/procesosData'
import type { DocumentoProveedorMapped, ProveedorMapped } from '../../shared/api/proveedoresApi'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Checkbox } from '../../shared/ui/Checkbox'
import { EmptyState } from '../../shared/ui/EmptyState'
import { Input } from '../../shared/ui/Input'
import { Modal } from '../../shared/ui/Modal'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { Pagination, usePagination } from '../../shared/ui/Pagination'
import { Select } from '../../shared/ui/Select'
import { Spinner } from '../../shared/ui/Spinner'
import { Table } from '../../shared/ui/Table'
import type { TableColumn } from '../../shared/ui/Table'
import { Textarea } from '../../shared/ui/Textarea'
import {
  abrirDocumentoProveedorMutation,
  eliminarProveedorMutation,
  habilitarProveedorEmpresaMutation,
  listarDocumentosProveedorQuery,
  listarProveedoresAuditoriaQuery,
  listarProveedoresQuery,
  proveedoresKeys,
  reintentarVerificacionArcaProveedorMutation,
} from './data/proveedoresData'

const ESTADO = {
  verificado: { texto: 'Verificado', variant: 'success' as const },
  pendiente: { texto: 'Pendiente', variant: 'warning' as const },
  rechazado: { texto: 'Rechazado', variant: 'error' as const },
}

const ESTADO_ARCA = {
  verificado: { texto: 'Verificado', variant: 'success' as const },
  pendiente: { texto: 'Pendiente', variant: 'warning' as const },
  rechazado: { texto: 'Rechazado', variant: 'error' as const },
  fallido: { texto: 'Fallido', variant: 'error' as const },
}

const ESTADO_EMPRESA = {
  sin_habilitar: { texto: 'Sin habilitar', variant: 'neutral' as const },
  habilitado: { texto: 'Habilitado', variant: 'success' as const },
  habilitado_con_alerta: { texto: 'Habilitado con alerta', variant: 'warning' as const },
  bloqueado: { texto: 'Bloqueado', variant: 'error' as const },
}

const ESTADO_DOCUMENTO = {
  vigente: { texto: 'Vigente', variant: 'success' as const },
  pendiente: { texto: 'Pendiente de dictamen', variant: 'warning' as const },
  observado: { texto: 'Observado', variant: 'warning' as const },
  vencido: { texto: 'Vencido / rechazado', variant: 'error' as const },
  sin_documentos: { texto: 'Sin documentacion', variant: 'neutral' as const },
}

const READINESS = {
  listo: { texto: 'Listo para habilitar', variant: 'success' as const },
  requiere_revision: { texto: 'Requiere revision', variant: 'warning' as const },
  bloqueado: { texto: 'Bloqueado', variant: 'error' as const },
}

const DICTAMEN_DOCUMENTO = {
  aprobado: { texto: 'Aprobado', variant: 'success' as const },
  rechazado: { texto: 'Rechazado', variant: 'error' as const },
  aprobado_con_excepcion: { texto: 'Aprobado con excepcion', variant: 'warning' as const },
}

const REVISION_ACCION = {
  0: 'Observacion',
  1: 'Subsanacion',
  2: 'Dictamen',
  Observation: 'Observacion',
  Remediation: 'Subsanacion',
  Verdict: 'Dictamen',
}

type ChecklistRevision = {
  arcaReviewed: boolean
  documentsReviewed: boolean
  warningsAccepted: boolean
}

type ProveedorRow = ProveedorMapped & Record<string, unknown>

export function ProveedoresDirectorioPage() {
  const { rol, tenantId } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const esSuperAdmin = rol === ROLES.SUPER_ADMIN
  const puedeGestionarHabilitacion = rol === ROLES.COMPRADOR || rol === ROLES.ADMINISTRADOR
  const puedeInvitar = rol === ROLES.COMPRADOR

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const [estadoArca, setEstadoArca] = useState('')
  const [estadoEmpresa, setEstadoEmpresa] = useState('')
  const [estadoDocumental, setEstadoDocumental] = useState('')
  const [readinessStatus, setReadinessStatus] = useState('')
  const [rubro, setRubro] = useState('')
  const [provincia, setProvincia] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [cercania, setCercania] = useState('')
  const [procesoSeleccionadoId, setProcesoSeleccionadoId] = useState('')
  const [procesandoId, setProcesandoId] = useState<string | null>(null)
  const [invitandoId, setInvitandoId] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const [reintentandoId, setReintentandoId] = useState<string | null>(null)
  const [abriendoDocumentoId, setAbriendoDocumentoId] = useState<string | null>(null)
  const [modalDetalleProveedor, setModalDetalleProveedor] = useState<ProveedorMapped | null>(null)
  const [modalRevisionProveedor, setModalRevisionProveedor] = useState<ProveedorMapped | null>(null)
  const [checklistRevision, setChecklistRevision] = useState<ChecklistRevision>({
    arcaReviewed: false,
    documentsReviewed: false,
    warningsAccepted: false,
  })
  const [notaRevision, setNotaRevision] = useState('')

  const filtros = { busqueda, estado, rubro, provincia, localidad, cercania, tenantId }
  const proveedoresQuery = useQuery({
    queryKey: [...proveedoresKeys.list(filtros), rol === 'auditor' ? 'auditoria' : 'directorio'],
    queryFn: () => rol === 'auditor' ? listarProveedoresAuditoriaQuery(filtros) : listarProveedoresQuery(filtros),
    enabled: Boolean(tenantId || esSuperAdmin),
    placeholderData: (previousData) => previousData,
  })

  const procesosInvitablesQuery = useQuery({
    queryKey: procesosKeys.invitables(tenantId),
    queryFn: () => listarProcesosInvitablesQuery({ tenantId }),
    enabled: Boolean(tenantId && puedeInvitar),
  })

  const proveedorModal = modalDetalleProveedor ?? modalRevisionProveedor
  const documentosProveedorQuery = useQuery({
    queryKey: proveedoresKeys.documents(proveedorModal?.id),
    queryFn: () => listarDocumentosProveedorQuery({ proveedorId: proveedorModal?.id }),
    enabled: Boolean(proveedorModal?.id),
  })

  const habilitarMutation = useMutation({
    mutationFn: habilitarProveedorEmpresaMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: proveedoresKeys.lists() })
      toast.success('Proveedor evaluado para tu empresa.')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const invitarMutation = useMutation({
    mutationFn: invitarProveedorAProcesoMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: procesosKeys.invitables(tenantId) })
      toast.success('Invitacion enviada al proveedor.')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const eliminarMutation = useMutation({
    mutationFn: eliminarProveedorMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: proveedoresKeys.lists() })
      toast.success('Proveedor eliminado.')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const reintentarArcaMutation = useMutation({
    mutationFn: reintentarVerificacionArcaProveedorMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: proveedoresKeys.lists() })
      toast.success('Verificacion ARCA reenviada. El proceso puede demorar unos segundos.')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const abrirDocumentoMutation = useMutation({
    mutationFn: abrirDocumentoProveedorMutation,
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const proveedores = useMemo(() => {
    const lista = proveedoresQuery.data ?? []
    return lista.filter((proveedor) => {
      if (estadoArca && proveedor.estadoArca !== estadoArca) return false
      if (estadoEmpresa && proveedor.estadoEmpresa !== estadoEmpresa) return false
      if (estadoDocumental && obtenerEstadoDocumental(proveedor) !== estadoDocumental) return false
      if (readinessStatus && proveedor.readinessStatus !== readinessStatus) return false
      return true
    })
  }, [estadoArca, estadoEmpresa, estadoDocumental, proveedoresQuery.data, readinessStatus])

  const procesosInvitables = useMemo(() => procesosInvitablesQuery.data ?? [], [procesosInvitablesQuery.data])
  const { paginatedItems, setPage, setPageSize, ...paginacion } = usePagination(proveedores)
  const procesoActivoId = procesoSeleccionadoId || procesosInvitables[0]?.id || ''

  function abrirDetalle(proveedor: ProveedorMapped) {
    setModalDetalleProveedor(proveedor)
  }

  function abrirRevision(proveedor: ProveedorMapped) {
    setModalRevisionProveedor(proveedor)
    setChecklistRevision({
      arcaReviewed: false,
      documentsReviewed: false,
      warningsAccepted: false,
    })
    setNotaRevision('')
  }

  function cerrarModales() {
    if (habilitarMutation.isPending) return
    setModalDetalleProveedor(null)
    setModalRevisionProveedor(null)
  }

  async function abrirDocumento(documentoId: string) {
    setAbriendoDocumentoId(documentoId)
    try {
      await abrirDocumentoMutation.mutateAsync({ documentoId })
    } finally {
      setAbriendoDocumentoId(null)
    }
  }

  async function invitar(proveedorId: string) {
    if (!tenantId || !procesoActivoId) return
    setInvitandoId(proveedorId)
    try {
      await invitarMutation.mutateAsync({
        tenantId,
        procesoId: procesoActivoId,
        proveedorId,
      })
    } finally {
      setInvitandoId(null)
    }
  }

  async function eliminar(proveedor: ProveedorMapped) {
    const confirmado = await confirm({
      variant: 'danger',
      title: 'Eliminar proveedor',
      message: `Se eliminara ${proveedor.razonSocial}. Esta accion no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    })

    if (!confirmado) return

    setEliminandoId(proveedor.id)
    try {
      await eliminarMutation.mutateAsync({ proveedorId: proveedor.id })
    } finally {
      setEliminandoId(null)
    }
  }

  async function reintentarArca(proveedorId: string) {
    setReintentandoId(proveedorId)
    try {
      await reintentarArcaMutation.mutateAsync({ proveedorId })
    } finally {
      setReintentandoId(null)
    }
  }

  async function habilitarProveedor() {
    if (!tenantId || !modalRevisionProveedor) return

    setProcesandoId(modalRevisionProveedor.id)
    try {
      await habilitarMutation.mutateAsync({
        tenantId,
        proveedorId: modalRevisionProveedor.id,
        ...checklistRevision,
        reviewNotes: notaRevision,
      })
      cerrarModales()
    } finally {
      setProcesandoId(null)
    }
  }

  const columns: TableColumn<ProveedorRow>[] = [
    { header: 'Proveedor', accessor: 'razonSocial', render: (_value: unknown, proveedor: ProveedorMapped) => (
      <div className="space-y-1">
        <div className="font-medium text-text">{proveedor.razonSocial}</div>
        <div className="text-xs text-text-muted">{proveedor.rubro} · {proveedor.localidad}, {proveedor.provincia}</div>
      </div>
    ) },
    { header: 'CUIT', accessor: 'cuit', render: (valor: unknown) => <code>{String(valor ?? '---')}</code> },
    {
      header: 'Estado fiscal',
      accessor: 'estadoArca',
      render: (_value: unknown, proveedor: ProveedorMapped) => {
        const estadoArcaProveedor = ESTADO_ARCA[proveedor.estadoArca] ?? ESTADO_ARCA.pendiente
        const readiness = READINESS[proveedor.readinessStatus] ?? READINESS.requiere_revision
        return (
          <div className="flex max-w-xs flex-col gap-1">
            <div className="flex flex-wrap gap-2">
              <Badge variant={estadoArcaProveedor.variant}>{estadoArcaProveedor.texto}</Badge>
              <Badge variant={readiness.variant}>{readiness.texto}</Badge>
            </div>
            {proveedor.notasArca && <small className="text-xs leading-5 text-text-muted">{proveedor.notasArca}</small>}
          </div>
        )
      },
    },
    {
      header: 'Documentacion',
      accessor: 'documentosTotal',
      render: (_value: unknown, proveedor: ProveedorMapped) => {
        const estadoDocumentalProveedor = ESTADO_DOCUMENTO[obtenerEstadoDocumental(proveedor)] ?? ESTADO_DOCUMENTO.pendiente
        return (
          <div className="flex flex-col gap-1">
            <Badge variant={estadoDocumentalProveedor.variant}>{estadoDocumentalProveedor.texto}</Badge>
            <small className="text-xs text-text-muted">
              {proveedor.documentosAprobados}/{proveedor.documentosTotal} aprobados · {proveedor.documentosPendientesRevision} pendientes
            </small>
          </div>
        )
      },
    },
    {
      header: 'Habilitacion',
      accessor: 'estadoEmpresa',
      render: (_value: unknown, proveedor: ProveedorMapped) => {
        const estadoEmpresaProveedor = ESTADO_EMPRESA[proveedor.estadoEmpresa] ?? ESTADO_EMPRESA.sin_habilitar
        return (
          <div className="flex flex-col gap-1">
            <Badge variant={estadoEmpresaProveedor.variant}>{estadoEmpresaProveedor.texto}</Badge>
            <small className="text-xs text-text-muted">
              {proveedor.ultimaRevisionEmpresaEn ? `Ultima revision ${formatearFechaHora(proveedor.ultimaRevisionEmpresaEn)}` : 'Sin revision registrada'}
            </small>
          </div>
        )
      },
    },
    {
      header: '',
      accessor: 'acciones',
      sortKey: false,
      render: (_value: unknown, proveedor: ProveedorMapped) => {
        if (!tenantId && !esSuperAdmin) return null

        const requiereHabilitacion =
          proveedor.estadoEmpresa === 'sin_habilitar' || proveedor.estadoEmpresa === 'bloqueado'

        return (
          <div className="ml-auto flex w-full max-w-[11.5rem] flex-col items-stretch gap-2">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => abrirDetalle(proveedor)}
              className="w-full whitespace-nowrap"
            >
              Ver detalle
            </Button>
            {puedeGestionarHabilitacion && requiereHabilitacion && (
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => abrirRevision(proveedor)}
                disabled={procesandoId === proveedor.id}
                className="w-full whitespace-nowrap"
              >
                {procesandoId === proveedor.id ? 'Revisando...' : 'Revisar'}
              </Button>
            )}
            {puedeInvitar && (
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => invitar(proveedor.id)}
                disabled={
                  invitandoId === proveedor.id ||
                  !procesoActivoId ||
                  proveedor.estadoEmpresa === 'sin_habilitar' ||
                  proveedor.estadoEmpresa === 'bloqueado'
                }
                className="w-full whitespace-nowrap"
              >
                {invitandoId === proveedor.id ? 'Invitando...' : 'Invitar'}
              </Button>
            )}
            {esSuperAdmin && proveedor.estadoArca !== 'pendiente' && proveedor.estadoArca !== 'verificado' && (
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => reintentarArca(proveedor.id)}
                loading={reintentandoId === proveedor.id}
                className="w-full whitespace-nowrap"
              >
                Reintentar ARCA
              </Button>
            )}
            {esSuperAdmin && (
              <Button
                variant="danger"
                size="sm"
                type="button"
                onClick={() => eliminar(proveedor)}
                loading={eliminandoId === proveedor.id}
                className="w-full whitespace-nowrap"
              >
                Eliminar
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  const error = getErrorMessage(
    proveedoresQuery.error ??
      procesosInvitablesQuery.error ??
      documentosProveedorQuery.error,
    '',
  )

  return (
    <PageShell as="section" width="wide" className="px-0 py-0">
      <PageHeader
        title="Proveedores"
        description="Gestiona alta, revision fiscal, documentacion, habilitacion e invitaciones desde un solo lugar."
        meta={
          <>
            <Badge variant="info">{proveedores.length} proveedor(es)</Badge>
            <Badge variant="neutral">Red compartida entre empresas</Badge>
          </>
        }
      />

      <Alert variant="info">
        Cada proveedor se registra una sola vez. Desde esta pantalla podes ver si ya esta listo para operar o que le falta para quedar habilitado.
      </Alert>

      <Card hover={false} padding="md" className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-4">
          <Input
            placeholder="Buscar por razon social, CUIT, rubro o provincia..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
          <Select value={estado} onChange={(event) => setEstado(event.target.value)}>
            <option value="">Estado global</option>
            <option value="verificado">Verificado</option>
            <option value="pendiente">Pendiente</option>
            <option value="rechazado">Rechazado</option>
          </Select>
          <Select value={estadoArca} onChange={(event) => setEstadoArca(event.target.value)}>
            <option value="">ARCA</option>
            <option value="verificado">Verificado</option>
            <option value="pendiente">Pendiente</option>
            <option value="rechazado">Rechazado</option>
            <option value="fallido">Fallido</option>
          </Select>
          <Select value={estadoEmpresa} onChange={(event) => setEstadoEmpresa(event.target.value)}>
            <option value="">Habilitacion</option>
            <option value="sin_habilitar">Sin habilitar</option>
            <option value="habilitado">Habilitado</option>
            <option value="habilitado_con_alerta">Habilitado con alerta</option>
            <option value="bloqueado">Bloqueado</option>
          </Select>
          <Select value={estadoDocumental} onChange={(event) => setEstadoDocumental(event.target.value)}>
            <option value="">Documentacion</option>
            <option value="vigente">Vigente</option>
            <option value="pendiente">Pendiente de dictamen</option>
            <option value="observado">Observado</option>
            <option value="vencido">Vencido / rechazado</option>
            <option value="sin_documentos">Sin documentacion</option>
          </Select>
          <Select value={readinessStatus} onChange={(event) => setReadinessStatus(event.target.value)}>
            <option value="">Semaforo operativo</option>
            <option value="listo">Listo para habilitar</option>
            <option value="requiere_revision">Requiere revision</option>
            <option value="bloqueado">Bloqueado</option>
          </Select>
          <Input placeholder="Rubro" value={rubro} onChange={(event) => setRubro(event.target.value)} />
          <Input placeholder="Provincia" value={provincia} onChange={(event) => setProvincia(event.target.value)} />
          <Input placeholder="Localidad" value={localidad} onChange={(event) => setLocalidad(event.target.value)} />
          <Select value={cercania} onChange={(event) => setCercania(event.target.value)}>
            <option value="">Cercania</option>
            <option value="sameProvince">Misma provincia</option>
            <option value="sameLocality">Misma localidad</option>
          </Select>
        </div>
      </Card>

      {puedeInvitar && (
        <Card hover={false} padding="md" className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-text">
            <Building2 size={18} />
            Invitar a proceso
          </div>
          {procesosInvitables.length === 0 ? (
            <p className="m-0 text-sm text-text-muted">Publica un proceso de compra antes de invitar proveedores.</p>
          ) : (
            <Select
              label="Proceso publicado"
              value={procesoActivoId}
              onChange={(event) => setProcesoSeleccionadoId(event.target.value)}
              fieldClassName="mb-0"
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

      {error && <Alert variant="error">{error}</Alert>}

      {proveedoresQuery.isLoading || proveedoresQuery.isFetching ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : proveedores.length === 0 ? (
        <EmptyState icon={Users} title="Sin proveedores" description="No hay proveedores que coincidan con el filtro." />
      ) : (
        <>
          <Table data={paginatedItems as ProveedorRow[]} columns={columns} />
          <Pagination {...paginacion} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </>
      )}

      <ProveedorDetalleModal
        open={Boolean(modalDetalleProveedor)}
        proveedor={modalDetalleProveedor}
        documentos={documentosProveedorQuery.data ?? []}
        loadingDocumentos={documentosProveedorQuery.isLoading || documentosProveedorQuery.isFetching}
        onClose={cerrarModales}
        onOpenDocument={abrirDocumento}
        openingDocumentId={abriendoDocumentoId}
      />

      <RevisionHabilitacionModal
        open={Boolean(modalRevisionProveedor)}
        proveedor={modalRevisionProveedor}
        documentos={documentosProveedorQuery.data ?? []}
        loadingDocumentos={documentosProveedorQuery.isLoading || documentosProveedorQuery.isFetching}
        checklist={checklistRevision}
        setChecklist={setChecklistRevision}
        nota={notaRevision}
        setNota={setNotaRevision}
        onClose={cerrarModales}
        onConfirm={habilitarProveedor}
        confirming={habilitarMutation.isPending}
        onOpenDocument={abrirDocumento}
        openingDocumentId={abriendoDocumentoId}
      />
    </PageShell>
  )
}

function ProveedorDetalleModal({
  open,
  proveedor,
  documentos,
  loadingDocumentos,
  onClose,
  onOpenDocument,
  openingDocumentId,
}: {
  open: boolean
  proveedor: ProveedorMapped | null
  documentos: DocumentoProveedorMapped[]
  loadingDocumentos: boolean
  onClose: () => void
  onOpenDocument: (documentoId: string) => void
  openingDocumentId: string | null
}) {
  if (!proveedor) return null

  const readiness = READINESS[proveedor.readinessStatus] ?? READINESS.requiere_revision
  const estadoGlobal = ESTADO[proveedor.estado] ?? ESTADO.pendiente
  const estadoArca = ESTADO_ARCA[proveedor.estadoArca] ?? ESTADO_ARCA.pendiente
  const estadoEmpresa = ESTADO_EMPRESA[proveedor.estadoEmpresa] ?? ESTADO_EMPRESA.sin_habilitar
  const bloqueos = obtenerBloqueos(proveedor, documentos)
  const historial = documentos
    .flatMap((documento) => documento.revisiones.map((revision) => ({ ...revision, documentoNombre: documento.nombreArchivo })))
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
    .slice(0, 8)

  return (
    <Modal open={open} onClose={onClose} title="Detalle del proveedor" size="xl">
      <div className="max-h-[78vh] space-y-4 overflow-y-auto pr-1">
        <div className="flex flex-wrap gap-2">
          <Badge variant={estadoGlobal.variant}>{estadoGlobal.texto}</Badge>
          <Badge variant={estadoArca.variant}>{estadoArca.texto}</Badge>
          <Badge variant={estadoEmpresa.variant}>{estadoEmpresa.texto}</Badge>
          <Badge variant={readiness.variant}>{readiness.texto}</Badge>
        </div>

        {bloqueos.length > 0 ? (
          <Alert variant={proveedor.readinessStatus === 'bloqueado' ? 'error' : 'warning'}>
            {bloqueos.join(' | ')}
          </Alert>
        ) : (
          <Alert variant="success">El proveedor no tiene bloqueos visibles y su documentacion esta alineada para operar.</Alert>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card hover={false} padding="sm" className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-text">
              <Building2 size={18} />
              Datos declarados
            </div>
            <ResumenGrid
              items={[
                ['Razon social', proveedor.razonSocial],
                ['CUIT', proveedor.cuit],
                ['Email', proveedor.email],
                ['Rubro', proveedor.rubro],
                ['Provincia', proveedor.provincia],
                ['Localidad', proveedor.localidad],
              ]}
            />
          </Card>

          <Card hover={false} padding="sm" className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-text">
              <ShieldCheck size={18} />
              Datos ARCA
            </div>
            <ResumenGrid
              items={[
                ['Razon social ARCA', proveedor.arcaRazonSocial || 'Sin dato informado'],
                ['Condicion IVA', proveedor.arcaCondicionIva || 'Sin dato informado'],
                ['Domicilio fiscal', proveedor.arcaDomicilioFiscal || 'Sin dato informado'],
                ['Verificado el', formatearFechaHora(proveedor.verificadoArcaEn)],
              ]}
            />
            {proveedor.notasArca && <p className="m-0 text-sm leading-6 text-text-muted">{proveedor.notasArca}</p>}
          </Card>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <ResumenMetric icon={FileCheck2} label="Aprobados" value={`${proveedor.documentosAprobados}/${proveedor.documentosTotal}`} />
          <ResumenMetric icon={FileClock} label="Pendientes" value={String(proveedor.documentosPendientesRevision)} />
          <ResumenMetric icon={CircleAlert} label="Rechazados" value={String(proveedor.documentosRechazados)} />
          <ResumenMetric icon={CircleAlert} label="Vencidos" value={String(proveedor.documentosVencidos)} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <Card hover={false} padding="sm" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-text">Documentacion cargada</div>
            <div className="text-xs text-text-muted">
              {proveedor.ultimaRevisionEmpresaEn ? `Ultima revision ${formatearFechaHora(proveedor.ultimaRevisionEmpresaEn)}` : 'Sin revision administrativa'}
            </div>
          </div>
          {loadingDocumentos ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : documentos.length === 0 ? (
            <Alert variant="warning">El proveedor todavia no cargo documentacion.</Alert>
          ) : (
            <div className="max-h-80 overflow-auto rounded-md border border-border">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-background">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Tipo</th>
                    <th className="px-3 py-2 font-semibold">Archivo</th>
                    <th className="px-3 py-2 font-semibold">Estado</th>
                    <th className="px-3 py-2 font-semibold">Dictamen</th>
                    <th className="px-3 py-2 font-semibold">Archivo</th>
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((documento) => {
                    const estadoDocumento = ESTADO_DOCUMENTO[obtenerEstadoDocumentoDesdeArchivo(documento)] ?? ESTADO_DOCUMENTO.vigente
                    const dictamen = documento.dictamen ? DICTAMEN_DOCUMENTO[documento.dictamen] : null
                    return (
                      <tr key={documento.id} className="border-t border-border">
                        <td className="px-3 py-2">{documento.tipoNombre}</td>
                        <td className="px-3 py-2">
                          <div>{documento.nombreArchivo}</div>
                          <div className="text-xs text-text-muted">{formatearFecha(documento.venceEl)}</div>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={estadoDocumento.variant}>{estadoDocumento.texto}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          {dictamen ? <Badge variant={dictamen.variant}>{dictamen.texto}</Badge> : <Badge variant="neutral">Sin dictamen</Badge>}
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenDocument(documento.id)}
                            loading={openingDocumentId === documento.id}
                          >
                            Ver PDF
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card hover={false} padding="sm" className="space-y-3">
          <div className="text-sm font-semibold text-text">Historial de revision</div>
          {historial.length === 0 ? (
            <p className="m-0 text-sm text-text-muted">Todavia no hay observaciones ni dictamenes registrados.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-auto pr-1">
              {historial.map((revision) => (
                <div key={revision.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-text">
                      {REVISION_ACCION[revision.accion as keyof typeof REVISION_ACCION] ?? String(revision.accion)} · {revision.documentoNombre}
                    </div>
                    <div className="text-xs text-text-muted">{formatearFechaHora(revision.fecha)}</div>
                  </div>
                  <p className="mb-0 mt-2 text-sm text-text-muted">{revision.notas || 'Sin notas.'}</p>
                  {revision.excepcion && <p className="mb-0 mt-2 text-sm text-warning">Excepcion: {revision.excepcion}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>
        </div>
      </div>
    </Modal>
  )
}

function RevisionHabilitacionModal({
  open,
  proveedor,
  documentos,
  loadingDocumentos,
  checklist,
  setChecklist,
  nota,
  setNota,
  onClose,
  onConfirm,
  confirming,
  onOpenDocument,
  openingDocumentId,
}: {
  open: boolean
  proveedor: ProveedorMapped | null
  documentos: DocumentoProveedorMapped[]
  loadingDocumentos: boolean
  checklist: ChecklistRevision
  setChecklist: Dispatch<SetStateAction<ChecklistRevision>>
  nota: string
  setNota: Dispatch<SetStateAction<string>>
  onClose: () => void
  onConfirm: () => void
  confirming: boolean
  onOpenDocument: (documentoId: string) => void
  openingDocumentId: string | null
}) {
  if (!proveedor) return null

  const readiness = READINESS[proveedor.readinessStatus] ?? READINESS.requiere_revision
  const bloqueos = obtenerBloqueos(proveedor, documentos)
  const puedeConfirmar = checklist.arcaReviewed && checklist.documentsReviewed && checklist.warningsAccepted
  const politica = proveedor.politicaEstricta == null
    ? 'Politica de empresa no disponible.'
    : proveedor.politicaEstricta
      ? 'Politica estricta: con faltantes o vencimientos quedara bloqueado.'
      : 'Politica flexible: se puede habilitar con alerta si no hay bloqueos fiscales.'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Revisar proveedor"
      size="lg"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} disabled={confirming}>
            Cancelar
          </Button>
          <Button type="button" onClick={onConfirm} disabled={!puedeConfirmar || confirming} loading={confirming}>
            Confirmar habilitacion
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant={readiness.variant}>{readiness.texto}</Badge>
          <Badge variant={proveedor.politicaEstricta ? 'info' : 'neutral'}>
            {proveedor.politicaEstricta ? 'Politica estricta' : 'Politica flexible'}
          </Badge>
        </div>

        <Alert variant={bloqueos.some((item) => item.startsWith('ARCA')) ? 'error' : 'warning'}>
          {bloqueos.length > 0 ? bloqueos.join(' | ') : 'No hay bloqueos visibles. Solo resta confirmar la revision administrativa.'}
        </Alert>

        <Card hover={false} padding="sm" className="space-y-3">
          <ResumenGrid
            items={[
              ['Proveedor', proveedor.razonSocial],
              ['CUIT', proveedor.cuit],
              ['Estado ARCA', (ESTADO_ARCA[proveedor.estadoArca] ?? ESTADO_ARCA.pendiente).texto],
              ['Ultima revision', formatearFechaHora(proveedor.ultimaRevisionEmpresaEn)],
            ]}
          />
          <p className="m-0 text-sm text-text-muted">{politica}</p>
          {proveedor.advertenciaEmpresa && (
            <Alert variant="warning">{proveedor.advertenciaEmpresa}</Alert>
          )}
        </Card>

        <Card hover={false} padding="sm" className="space-y-3">
          <div className="text-sm font-semibold text-text">Documentacion a revisar</div>
          {loadingDocumentos ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : documentos.length === 0 ? (
            <Alert variant="error">El proveedor no tiene documentacion cargada.</Alert>
          ) : (
            <div className="space-y-2">
              {documentos.map((documento) => {
                const estadoDocumento = ESTADO_DOCUMENTO[obtenerEstadoDocumentoDesdeArchivo(documento)] ?? ESTADO_DOCUMENTO.vigente
                const dictamen = documento.dictamen ? DICTAMEN_DOCUMENTO[documento.dictamen] : null
                return (
                  <div key={documento.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text">{documento.tipoNombre}</div>
                      <div className="text-xs text-text-muted">
                        {documento.nombreArchivo} · vence {formatearFecha(documento.venceEl)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={estadoDocumento.variant}>{estadoDocumento.texto}</Badge>
                      {dictamen ? <Badge variant={dictamen.variant}>{dictamen.texto}</Badge> : <Badge variant="neutral">Sin dictamen</Badge>}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenDocument(documento.id)}
                        loading={openingDocumentId === documento.id}
                      >
                        Ver PDF
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card hover={false} padding="sm" className="space-y-3">
          <Checkbox
            checked={checklist.arcaReviewed}
            onChange={(event) => setChecklist((actual) => ({ ...actual, arcaReviewed: event.target.checked }))}
            label="Revise la constancia fiscal y las observaciones de ARCA."
          />
          <Checkbox
            checked={checklist.documentsReviewed}
            onChange={(event) => setChecklist((actual) => ({ ...actual, documentsReviewed: event.target.checked }))}
            label="Revise documentos, dictamenes, vencimientos y observaciones."
          />
          <Checkbox
            checked={checklist.warningsAccepted}
            onChange={(event) => setChecklist((actual) => ({ ...actual, warningsAccepted: event.target.checked }))}
            label="Confirmo la decision de habilitar con las advertencias y bloqueos visibles."
          />
          <Textarea
            label="Notas de revision"
            value={nota}
            onChange={(event) => setNota(event.target.value)}
            rows={3}
            placeholder="Ej: se habilita con seguimiento por vencimiento proximo del certificado fiscal."
            fieldClassName="mb-0"
          />
        </Card>
      </div>
    </Modal>
  )
}

function ResumenGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</dt>
          <dd className="m-0 mt-1 text-sm text-text">{value || '---'}</dd>
        </div>
      ))}
    </dl>
  )
}

function ResumenMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileCheck2
  label: string
  value: string
}) {
  return (
    <Card hover={false} padding="sm" className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
        <Icon size={16} />
        {label}
      </div>
      <div className="text-xl font-semibold text-text">{value}</div>
    </Card>
  )
}

function obtenerEstadoDocumental(proveedor: ProveedorMapped) {
  if (proveedor.documentosTotal === 0) return 'sin_documentos'
  if (proveedor.documentosVencidos > 0 || proveedor.documentosRechazados > 0) return 'vencido'
  if (proveedor.documentosPendientesRevision > 0) return 'pendiente'
  return 'vigente'
}

function obtenerEstadoDocumentoDesdeArchivo(documento: DocumentoProveedorMapped) {
  if (documento.estado === 'vencido' || documento.dictamen === 'rechazado') return 'vencido'
  if (documento.dictamen == null) return 'pendiente'
  if (documento.dictamen === 'aprobado_con_excepcion' || documento.estado === 'por_vencer') return 'observado'
  return 'vigente'
}

function obtenerBloqueos(proveedor: ProveedorMapped, documentos: DocumentoProveedorMapped[]) {
  const bloqueos: string[] = []

  if (!proveedor.arcaVerificado || proveedor.estadoArca !== 'verificado') {
    bloqueos.push('ARCA todavia no valido al proveedor.')
  }
  if (proveedor.documentosTotal === 0) {
    bloqueos.push('Falta documentacion global obligatoria.')
  }
  if (proveedor.documentosVencidos > 0) {
    bloqueos.push(`Hay ${proveedor.documentosVencidos} documento(s) vencidos.`)
  }
  if (proveedor.documentosRechazados > 0) {
    bloqueos.push(`Hay ${proveedor.documentosRechazados} documento(s) rechazados.`)
  }
  if (proveedor.documentosPendientesRevision > 0) {
    bloqueos.push(`Quedan ${proveedor.documentosPendientesRevision} documento(s) sin dictamen.`)
  }
  if (proveedor.advertenciaEmpresa) {
    bloqueos.push(proveedor.advertenciaEmpresa)
  }
  if (documentos.some((documento) => documento.tipoNombre === 'Constancia CUIT/CUIL') === false) {
    bloqueos.push('No se visualiza constancia CUIT/CUIL entre los documentos cargados.')
  }

  return bloqueos
}

function formatearFecha(fechaIso?: string | null) {
  if (!fechaIso) return '---'
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short' }).format(new Date(fechaIso))
}

function formatearFechaHora(fechaIso?: string | null) {
  if (!fechaIso) return '---'
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(fechaIso))
}
