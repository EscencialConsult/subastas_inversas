import { useEffect, useMemo, useState } from 'react'
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
import { Badge } from '../../shared/ui/Badge'
import { Alert } from '../../shared/ui/Alert'
import { Spinner } from '../../shared/ui/Spinner'

const ESTADO = {
  verificado: { texto: 'Verificado', clase: 'success' },
  pendiente: { texto: 'Pendiente', clase: 'warning' },
  rechazado: { texto: 'Rechazado', clase: 'error' },
}

const ESTADO_DOCUMENTO = {
  valido: { texto: 'Vigente', clase: 'success' },
  por_vencer: { texto: 'Por vencer', clase: 'warning' },
  vencido: { texto: 'Vencido', clase: 'error' },
}

const DICTAMEN = {
  aprobado: { texto: 'Aprobado', clase: 'success' },
  rechazado: { texto: 'Rechazado', clase: 'error' },
  aprobado_con_excepcion: { texto: 'Aprobado con excepcion', clase: 'warning' },
}

const ACCION_REVISION = {
  0: 'Observacion',
  1: 'Subsanacion',
  2: 'Dictamen',
  Observation: 'Observacion',
  Remediation: 'Subsanacion',
  Verdict: 'Dictamen',
}

export function EvaluacionProveedoresPage() {
  const { tenantId, usuario } = useAuth()
  const [proveedorId, setProveedorId] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [formularios, setFormularios] = useState({})
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

  useEffect(() => {
    setProveedorId((actual) => {
      if (actual && proveedores.some((proveedor) => proveedor.id === actual)) return actual
      return proveedores[0]?.id ?? ''
    })
  }, [proveedores])

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

  function actualizarFormulario(documentoId, campo, valor) {
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

  function observar(documentoId) {
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

  function dictaminar(documentoId) {
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

  useEffect(() => {
    setError(getErrorMessage(proveedoresError ?? documentosError, ''))
  }, [proveedoresError, documentosError])

  function actualizarDocumentos() {
    setError('')
    refetchDocumentos()
  }

  return (
    <section>
      <div className="encabezado">
        <h1>Evaluacion de proveedores</h1>
      </div>

      <div className="filtros">
        <input
          className="filtros__busqueda"
          placeholder="Buscar por razon social, CUIT, rubro o provincia..."
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />
        <select value={estado} onChange={(event) => setEstado(event.target.value)}>
          <option value="">Todos los estados</option>
          <option value="verificado">Verificado</option>
          <option value="pendiente">Pendiente</option>
          <option value="rechazado">Rechazado</option>
        </select>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {mensaje && <Alert variant="success">{mensaje}</Alert>}

      <div className="rounded-md border border-border bg-surface p-5 shadow-sm" style={{ marginBottom: 16 }}>
        <h2 className="text-lg font-semibold text-text">Proveedor</h2>
        {cargandoProveedores ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : proveedores.length === 0 ? (
          <p className="text-sm text-text-muted">No hay proveedores para evaluar.</p>
        ) : (
          <label className="campo">
            <span>Seleccionar proveedor</span>
            <select value={proveedorId} onChange={(event) => setProveedorId(event.target.value)}>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.razonSocial} - {proveedor.cuit}
                </option>
              ))}
            </select>
          </label>
        )}

        {proveedorSeleccionado && (
          <div className="perfil__solo-lectura">
            <span>Rubro: {proveedorSeleccionado.rubro}</span>
            <span>Provincia: {proveedorSeleccionado.provincia}</span>
            <span>Email: {proveedorSeleccionado.email}</span>
            <span>
              Estado:{' '}
              <Badge variant={(ESTADO[proveedorSeleccionado.estado] ?? ESTADO.pendiente).clase}>
                {(ESTADO[proveedorSeleccionado.estado] ?? ESTADO.pendiente).texto}
              </Badge>
            </span>
          </div>
        )}
      </div>

      <div className="rounded-md border border-border bg-surface p-5 shadow-sm">
        <div className="encabezado">
          <h2 className="text-lg font-semibold text-text">Documentacion</h2>
          <button
            className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
            type="button"
            onClick={actualizarDocumentos}
            disabled={!proveedorId || cargandoDocumentos}
          >
            Actualizar
          </button>
        </div>

        {cargandoDocumentos ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : documentos.length === 0 ? (
          <p className="text-sm text-text-muted">Este proveedor todavia no cargo documentacion.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-sm">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                  <th>Dictamen</th>
                  <th>Revision</th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((documento) => {
                  const estadoDocumento =
                    ESTADO_DOCUMENTO[documento.estado] ?? ESTADO_DOCUMENTO.valido
                  const dictamen = documento.dictamen ? DICTAMEN[documento.dictamen] : null
                  const tieneDictamen = Boolean(documento.dictamen)
                  const form = formularios[documento.id] ?? {
                    dictamen: '0',
                    notas: '',
                    excepcion: '',
                    observacion: '',
                  }

                  return (
                    <tr key={documento.id}>
                      <td>
                        {documento.nombreArchivo}
                        <small className="mt-1 block break-all font-mono text-xs text-text-muted">{documento.hashCorto}</small>
                      </td>
                      <td>{formatearFecha(documento.venceEl)}</td>
                      <td>
                        <Badge variant={estadoDocumento.clase}>
                          {estadoDocumento.texto}
                        </Badge>
                      </td>
                      <td>
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
                      </td>
                      <td>
                        <div className="documentos__revision">
                          {documento.revisiones.length > 0 && (
                            <div className="mt-1 block text-xs text-text-muted">
                              {documento.revisiones.slice(-3).map((revision) => (
                                <p key={revision.id}>
                                  {ACCION_REVISION[revision.accion] ?? revision.accion}:{' '}
                                  {revision.notas}
                                </p>
                              ))}
                            </div>
                          )}

                          <textarea
                            className="documentos__subsanacion"
                            rows={2}
                            value={form.observacion}
                            onChange={(event) =>
                              actualizarFormulario(documento.id, 'observacion', event.target.value)
                            }
                            placeholder="Observacion para subsanar"
                          />
                          <button
                            className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
                            type="button"
                            onClick={() => observar(documento.id)}
                            disabled={procesandoId === documento.id}
                          >
                            Observar
                          </button>

                          {!tieneDictamen && (
                            <>
                              <select
                                value={form.dictamen}
                                onChange={(event) =>
                                  actualizarFormulario(documento.id, 'dictamen', event.target.value)
                                }
                              >
                                <option value="0">Aprobar</option>
                                <option value="1">Rechazar</option>
                                <option value="2">Aprobar con excepcion</option>
                              </select>
                              <textarea
                                className="documentos__subsanacion"
                                rows={2}
                                value={form.notas}
                                onChange={(event) =>
                                  actualizarFormulario(documento.id, 'notas', event.target.value)
                                }
                                placeholder="Notas del dictamen"
                              />
                              {form.dictamen === '2' && (
                                <textarea
                                  className="documentos__subsanacion"
                                  rows={2}
                                  value={form.excepcion}
                                  onChange={(event) =>
                                    actualizarFormulario(documento.id, 'excepcion', event.target.value)
                                  }
                                  placeholder="Motivo de la excepcion"
                                />
                              )}
                              <button
                                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
                                type="button"
                                onClick={() => dictaminar(documento.id)}
                                disabled={procesandoId === documento.id}
                              >
                                Dictaminar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function formatearFecha(fechaIso) {
  if (!fechaIso) return '---'
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short' }).format(new Date(fechaIso))
}
