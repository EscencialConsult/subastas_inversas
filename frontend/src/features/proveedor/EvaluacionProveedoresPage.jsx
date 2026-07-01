import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import {
  dictaminarDocumentoProveedor,
  listarDocumentosProveedor,
  listarProveedoresParaEvaluacion,
  observarDocumentoProveedor,
} from '../../api/proveedoresApi'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner.jsx'

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
  const [proveedores, setProveedores] = useState([])
  const [proveedorId, setProveedorId] = useState('')
  const [documentos, setDocumentos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const [cargandoProveedores, setCargandoProveedores] = useState(true)
  const [cargandoDocumentos, setCargandoDocumentos] = useState(false)
  const [procesandoId, setProcesandoId] = useState(null)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [formularios, setFormularios] = useState({})

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCargandoProveedores(true)
      setError('')
      listarProveedoresParaEvaluacion({ tenantId, busqueda, estado })
        .then((lista) => {
          setProveedores(lista)
          if (lista.length === 0) setDocumentos([])
          setProveedorId((actual) => {
            if (actual && lista.some((proveedor) => proveedor.id === actual)) return actual
            return lista[0]?.id ?? ''
          })
        })
        .catch((err) => setError(err.message))
        .finally(() => setCargandoProveedores(false))
    }, 250)

    return () => clearTimeout(timeout)
  }, [tenantId, busqueda, estado])

  useEffect(() => {
    if (!proveedorId) {
      return
    }

    cargarDocumentos(proveedorId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proveedorId])

  const proveedorSeleccionado = useMemo(
    () => proveedores.find((proveedor) => proveedor.id === proveedorId) ?? null,
    [proveedores, proveedorId],
  )

  async function cargarDocumentos(id = proveedorId) {
    setCargandoDocumentos(true)
    setError('')
    try {
      const data = await listarDocumentosProveedor({ proveedorId: id })
      setDocumentos(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargandoDocumentos(false)
    }
  }

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

  async function observar(documentoId) {
    const observacion = formularios[documentoId]?.observacion?.trim()
    if (!observacion) {
      setError('Escribi una observacion para el proveedor.')
      return
    }

    setProcesandoId(documentoId)
    setError('')
    setMensaje('')
    try {
      await observarDocumentoProveedor({
        documentoId,
        evaluadorId: usuario.id,
        notas: observacion,
      })
      setMensaje('Observacion registrada.')
      setFormularios((actual) => ({
        ...actual,
        [documentoId]: { ...actual[documentoId], observacion: '' },
      }))
      await cargarDocumentos()
    } catch (err) {
      setError(err.message)
    } finally {
      setProcesandoId(null)
    }
  }

  async function dictaminar(documentoId) {
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

    setProcesandoId(documentoId)
    setError('')
    setMensaje('')
    try {
      await dictaminarDocumentoProveedor({
        documentoId,
        evaluadorId: usuario.id,
        dictamen: form.dictamen ?? '0',
        notas,
        excepcion: form.excepcion,
      })
      setMensaje('Dictamen registrado.')
      setFormularios((actual) => ({
        ...actual,
        [documentoId]: { dictamen: '0', notas: '', excepcion: '', observacion: '' },
      }))
      await cargarDocumentos()
    } catch (err) {
      setError(err.message)
    } finally {
      setProcesandoId(null)
    }
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

      <div className="form" style={{ marginBottom: 16 }}>
        <h2 className="form__titulo">Proveedor</h2>
        {cargandoProveedores ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : proveedores.length === 0 ? (
          <p className="form__seccion-ayuda">No hay proveedores para evaluar.</p>
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

      <div className="form">
        <div className="encabezado">
          <h2 className="form__titulo">Documentacion</h2>
          <button
            className="btn btn--texto"
            type="button"
            onClick={() => cargarDocumentos()}
            disabled={!proveedorId || cargandoDocumentos}
          >
            Actualizar
          </button>
        </div>

        {cargandoDocumentos ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : documentos.length === 0 ? (
          <p className="form__seccion-ayuda">Este proveedor todavia no cargo documentacion.</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
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
                        <small className="tabla__nota mono">{documento.hashCorto}</small>
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
                          <small className="tabla__nota">
                            Emitido el {formatearFecha(documento.dictaminadoEl)}
                          </small>
                        )}
                      </td>
                      <td>
                        <div className="documentos__revision">
                          {documento.revisiones.length > 0 && (
                            <div className="tabla__nota">
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
                            rows="2"
                            value={form.observacion}
                            onChange={(event) =>
                              actualizarFormulario(documento.id, 'observacion', event.target.value)
                            }
                            placeholder="Observacion para subsanar"
                          />
                          <button
                            className="btn btn--texto"
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
                                rows="2"
                                value={form.notas}
                                onChange={(event) =>
                                  actualizarFormulario(documento.id, 'notas', event.target.value)
                                }
                                placeholder="Notas del dictamen"
                              />
                              {form.dictamen === '2' && (
                                <textarea
                                  className="documentos__subsanacion"
                                  rows="2"
                                  value={form.excepcion}
                                  onChange={(event) =>
                                    actualizarFormulario(documento.id, 'excepcion', event.target.value)
                                  }
                                  placeholder="Motivo de la excepcion"
                                />
                              )}
                              <button
                                className="btn btn--primario"
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
