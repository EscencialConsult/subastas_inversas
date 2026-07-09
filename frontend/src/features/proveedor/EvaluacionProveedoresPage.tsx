import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import {
  dictaminarDocumentoProveedorMutation,
  listarDocumentosProveedorQuery,
  listarProveedoresEvaluacionQuery,
  observarDocumentoProveedorMutation,
  proveedoresKeys,
} from './data/proveedoresData'
import { getErrorMessage } from '../../shared/query/queryClient'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { EmptyState } from '../../shared/ui/EmptyState'
import { Input } from '../../shared/ui/Input'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { Select } from '../../shared/ui/Select'
import { Spinner } from '../../shared/ui/Spinner'
import { Table } from '../../shared/ui/Table'
import { Textarea } from '../../shared/ui/Textarea'

const ESTADO = {
  verificado: { texto: 'Verificado', clase: 'success' as const },
  pendiente: { texto: 'Pendiente', clase: 'warning' as const },
  rechazado: { texto: 'Rechazado', clase: 'error' as const },
}

const ESTADO_DOCUMENTO = {
  valido: { texto: 'Vigente', clase: 'success' as const },
  por_vencer: { texto: 'Por vencer', clase: 'warning' as const },
  vencido: { texto: 'Vencido', clase: 'error' as const },
}

const DICTAMEN = {
  aprobado: { texto: 'Aprobado', clase: 'success' as const },
  rechazado: { texto: 'Rechazado', clase: 'error' as const },
  aprobado_con_excepcion: { texto: 'Aprobado con excepcion', clase: 'warning' as const },
}

const ACCION_REVISION = {
  0: 'Observacion',
  1: 'Subsanacion',
  2: 'Dictamen',
  Observation: 'Observacion',
  Remediation: 'Subsanacion',
  Verdict: 'Dictamen',
}

interface DocumentoForm {
  dictamen?: string
  notas?: string
  excepcion?: string
  observacion?: string
}

export function EvaluacionProveedoresPage() {
  const { tenantId, usuario } = useAuth()
  const [proveedorId, setProveedorId] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [formularios, setFormularios] = useState<Record<string, DocumentoForm>>({})
  const [procesandoId, setProcesandoId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const filtros = { tenantId, busqueda, estado }
  const {
    data: proveedores = [],
    isLoading: cargandoProveedores,
    error: proveedoresError,
  } = useQuery({
    queryKey: proveedoresKeys.evaluationList(filtros),
    queryFn: () => listarProveedoresEvaluacionQuery(filtros),
    enabled: Boolean(tenantId),
  })

  const [provInited, setProvInited] = useState(false)
  if (proveedores.length > 0 && !provInited) {
    setProvInited(true)
    setProveedorId((actual) => {
      if (actual && proveedores.some((proveedor) => proveedor.id === actual)) return actual
      return proveedores[0]?.id ?? ''
    })
  }

  const {
    data: documentos = [],
    isLoading: cargandoDocumentos,
    error: documentosError,
    refetch: refetchDocumentos,
  } = useQuery({
    queryKey: proveedoresKeys.documents(proveedorId),
    queryFn: () => listarDocumentosProveedorQuery({ proveedorId }),
    enabled: Boolean(proveedorId),
  })

  const proveedorSeleccionado = useMemo(
    () => proveedores.find((proveedor) => proveedor.id === proveedorId) ?? null,
    [proveedores, proveedorId],
  )

  const observarMutation = useMutation({
    mutationFn: observarDocumentoProveedorMutation,
    onMutate: (params) => {
      setProcesandoId(params.documentoId)
      setError('')
      setMensaje('')
    },
    onSuccess: async (_, params) => {
      setMensaje('Observacion registrada.')
      setFormularios((actual) => ({
        ...actual,
        [params.documentoId]: { ...actual[params.documentoId], observacion: '' },
      }))
      await queryClient.invalidateQueries({ queryKey: proveedoresKeys.documents(proveedorId) })
    },
    onError: (err) => setError(getErrorMessage(err)),
    onSettled: () => setProcesandoId(null),
  })

  const dictaminarMutation = useMutation({
    mutationFn: dictaminarDocumentoProveedorMutation,
    onMutate: (params) => {
      setProcesandoId(params.documentoId)
      setError('')
      setMensaje('')
    },
    onSuccess: async (_, params) => {
      setMensaje('Dictamen registrado.')
      setFormularios((actual) => ({
        ...actual,
        [params.documentoId]: { dictamen: '0', notas: '', excepcion: '', observacion: '' },
      }))
      await queryClient.invalidateQueries({ queryKey: proveedoresKeys.documents(proveedorId) })
      await queryClient.invalidateQueries({ queryKey: proveedoresKeys.evaluationList(filtros) })
    },
    onError: (err) => setError(getErrorMessage(err)),
    onSettled: () => setProcesandoId(null),
  })

  function actualizarFormulario(documentoId: string, campo: keyof DocumentoForm, valor: string) {
    setFormularios((actual) => ({
      ...actual,
      [documentoId]: {
        dictamen: '0',
        notas: '',
        excepcion: '',
        observacion: '',
        ...actual[documentoId],
        [campo]: valor,
      },
    }))
  }

  function observar(documentoId: string) {
    const observacion = formularios[documentoId]?.observacion?.trim()
    if (!observacion) {
      setError('Escribi una observacion para el proveedor.')
      return
    }

    observarMutation.mutate({
      documentoId,
      evaluadorId: usuario?.id ?? '',
      notas: observacion,
    })
  }

  function dictaminar(documentoId: string) {
    const form = formularios[documentoId] ?? {}
    const notas = form.notas?.trim()
    if (!notas) {
      setError('Las notas del dictamen son obligatorias.')
      return
    }

    if (form.dictamen === '2' && !form.excepcion?.trim()) {
      setError('Para aprobar con excepcion hay que registrar el motivo.')
      return
    }

    dictaminarMutation.mutate({
      documentoId,
      evaluadorId: usuario?.id ?? '',
      dictamen: form.dictamen ?? '0',
      notas,
      excepcion: form.excepcion,
    })
  }

  const [errorSynced, setErrorSynced] = useState(false)
  const combinedError = getErrorMessage(proveedoresError ?? documentosError, '')
  if (combinedError && !errorSynced) {
    setErrorSynced(true)
    setError(combinedError)
  }
  if (!combinedError && errorSynced) {
    setErrorSynced(false)
  }

  function actualizarDocumentos() {
    setError('')
    refetchDocumentos()
  }

  const documentosRows = documentos.map((documento) => ({ ...documento })) as Array<Record<string, unknown>>

  return (
    <PageShell as="section" width="wide" className="px-0 py-0">
      <PageHeader
        title="Evaluacion de proveedores"
        description="Revisa documentacion global, registra observaciones y emite dictamenes."
      />

      <Card hover={false} padding="md">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <Input
            label="Buscar"
            placeholder="Buscar por razon social, CUIT, rubro o provincia..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
          <Select label="Estado" value={estado} onChange={(event) => setEstado(event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="verificado">Verificado</option>
            <option value="pendiente">Pendiente</option>
            <option value="rechazado">Rechazado</option>
          </Select>
        </div>
      </Card>

      {error && <Alert variant="error">{error}</Alert>}
      {mensaje && <Alert variant="success">{mensaje}</Alert>}

      <Card hover={false} padding="md" className="space-y-4">
        <h2 className="m-0 text-lg font-semibold text-text">Proveedor</h2>
        {cargandoProveedores ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : proveedores.length === 0 ? (
          <EmptyState title="Sin proveedores" description="No hay proveedores para evaluar." />
        ) : (
          <Select
            label="Seleccionar proveedor"
            value={proveedorId}
            onChange={(event) => setProveedorId(event.target.value)}
          >
            {proveedores.map((proveedor) => (
              <option key={proveedor.id} value={proveedor.id}>
                {proveedor.razonSocial} - {proveedor.cuit}
              </option>
            ))}
          </Select>
        )}

        {proveedorSeleccionado && (
          <dl className="grid gap-3 rounded-md border border-border bg-background p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <ResumenDato label="Rubro" value={proveedorSeleccionado.rubro} />
            <ResumenDato label="Provincia" value={proveedorSeleccionado.provincia} />
            <ResumenDato label="Email" value={proveedorSeleccionado.email} />
            <ResumenDato
              label="Estado"
              value={(
                <Badge variant={(ESTADO[proveedorSeleccionado.estado] ?? ESTADO.pendiente).clase}>
                  {(ESTADO[proveedorSeleccionado.estado] ?? ESTADO.pendiente).texto}
                </Badge>
              )}
            />
          </dl>
        )}
      </Card>

      <Card hover={false} padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-lg font-semibold text-text">Documentacion</h2>
          <Button
            variant="secondary"
            type="button"
            onClick={actualizarDocumentos}
            disabled={!proveedorId || cargandoDocumentos}
          >
            Actualizar
          </Button>
        </div>

        {cargandoDocumentos ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : documentos.length === 0 ? (
          <EmptyState title="Sin documentacion" description="Este proveedor todavia no cargo documentacion." />
        ) : (
          <Table
            data={documentosRows}
            sortable={false}
            columns={[
              {
                header: 'Documento',
                accessor: 'nombreArchivo',
                render: (value, documento) => (
                  <div>
                    <span>{String(value ?? '---')}</span>
                    <small className="mt-1 block break-all font-mono text-xs text-text-muted">
                      {String(documento.hashCorto ?? '')}
                    </small>
                  </div>
                ),
              },
              {
                header: 'Vencimiento',
                accessor: 'venceEl',
                render: (value) => formatearFecha(value),
              },
              {
                header: 'Estado',
                accessor: 'estado',
                render: (value) => {
                  const estadoDocumento = ESTADO_DOCUMENTO[String(value)] ?? ESTADO_DOCUMENTO.valido
                  return <Badge variant={estadoDocumento.clase}>{estadoDocumento.texto}</Badge>
                },
              },
              {
                header: 'Dictamen',
                accessor: 'dictamen',
                render: (value, documento) => {
                  const dictamen = value ? DICTAMEN[String(value)] : null
                  return (
                    <div>
                      {dictamen ? (
                        <Badge variant={dictamen.clase}>{dictamen.texto}</Badge>
                      ) : (
                        <Badge variant="neutral">Sin dictamen</Badge>
                      )}
                      {documento.dictaminadoEl && (
                        <small className="mt-1 block text-xs text-text-muted">
                          Emitido el {formatearFecha(documento.dictaminadoEl)}
                        </small>
                      )}
                    </div>
                  )
                },
              },
              {
                header: 'Revision',
                accessor: 'id',
                render: (_value, documento) => {
                  const documentoId = String(documento.id)
                  const revisiones = Array.isArray(documento.revisiones) ? documento.revisiones : []
                  const tieneDictamen = Boolean(documento.dictamen)
                  const form = formularios[documentoId] ?? {
                    dictamen: '0',
                    notas: '',
                    excepcion: '',
                    observacion: '',
                  }

                  return (
                    <div className="grid min-w-[280px] gap-2">
                      {revisiones.length > 0 && (
                        <div className="text-xs text-text-muted">
                          {revisiones.slice(-3).map((revision) => (
                            <p className="m-0" key={revision.id}>
                              {ACCION_REVISION[revision.accion] ?? revision.accion}: {revision.notas}
                            </p>
                          ))}
                        </div>
                      )}

                      <Textarea
                        rows={2}
                        value={form.observacion ?? ''}
                        onChange={(event) => actualizarFormulario(documentoId, 'observacion', event.target.value)}
                        placeholder="Observacion para subsanar"
                        fieldClassName="mb-0"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={() => observar(documentoId)}
                        disabled={procesandoId === documentoId}
                      >
                        Observar
                      </Button>

                      {!tieneDictamen && (
                        <>
                          <Select
                            value={form.dictamen ?? '0'}
                            onChange={(event) => actualizarFormulario(documentoId, 'dictamen', event.target.value)}
                            fieldClassName="mb-0"
                            aria-label="Dictamen"
                          >
                            <option value="0">Aprobar</option>
                            <option value="1">Rechazar</option>
                            <option value="2">Aprobar con excepcion</option>
                          </Select>
                          <Textarea
                            rows={2}
                            value={form.notas ?? ''}
                            onChange={(event) => actualizarFormulario(documentoId, 'notas', event.target.value)}
                            placeholder="Notas del dictamen"
                            fieldClassName="mb-0"
                          />
                          {form.dictamen === '2' && (
                            <Textarea
                              rows={2}
                              value={form.excepcion ?? ''}
                              onChange={(event) => actualizarFormulario(documentoId, 'excepcion', event.target.value)}
                              placeholder="Motivo de la excepcion"
                              fieldClassName="mb-0"
                            />
                          )}
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => dictaminar(documentoId)}
                            disabled={procesandoId === documentoId}
                            loading={procesandoId === documentoId}
                          >
                            Dictaminar
                          </Button>
                        </>
                      )}
                    </div>
                  )
                },
                sortKey: false,
              },
            ]}
          />
        )}
      </Card>
    </PageShell>
  )
}

function ResumenDato({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</dt>
      <dd className="m-0 mt-1 text-sm text-text">{value}</dd>
    </div>
  )
}

function formatearFecha(fechaIso) {
  if (!fechaIso) return '---'
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short' }).format(new Date(String(fechaIso)))
}
