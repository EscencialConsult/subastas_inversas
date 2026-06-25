// Home del proveedor: ve su perfil de empresa y su estado de verificacion.
// Es su espacio propio: no ve datos de ningun tenant comprador.

import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import {
  listarDocumentosProveedor,
  obtenerProveedorDeUsuario,
  subsanarDocumentoProveedor,
  subirDocumentoProveedor,
} from '../../api/proveedoresApi.js'

const ESTADO = {
  pendiente: { texto: 'Pendiente de verificacion', clase: 'badge--off' },
  verificado: { texto: 'Verificado', clase: 'badge--ok' },
}

const TIPOS_DOCUMENTO = [
  { valor: 'CuitCertificate', texto: 'Constancia CUIT' },
  { valor: 'TaxCertificate', texto: 'Certificado fiscal' },
  { valor: 'LegalDocument', texto: 'Documento legal' },
  { valor: 'Other', texto: 'Otro' },
]

const ESTADO_DOCUMENTO = {
  valido: { texto: 'Vigente', clase: 'badge--ok' },
  por_vencer: { texto: 'Por vencer', clase: 'badge--warn' },
  vencido: { texto: 'Vencido', clase: 'badge--error' },
}

const DICTAMEN_DOCUMENTO = {
  aprobado: { texto: 'Aprobado', clase: 'badge--ok' },
  rechazado: { texto: 'Rechazado', clase: 'badge--error' },
  aprobado_con_excepcion: { texto: 'Aprobado con excepcion', clase: 'badge--warn' },
}

export function ProveedorHomePage() {
  const { usuario } = useAuth()
  const [proveedor, setProveedor] = useState(null)
  const [documentos, setDocumentos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [cargandoDocumentos, setCargandoDocumentos] = useState(false)
  const [subiendoDocumento, setSubiendoDocumento] = useState(false)
  const [subsanandoId, setSubsanandoId] = useState(null)
  const [error, setError] = useState('')
  const [errorDocumento, setErrorDocumento] = useState('')
  const [subsanaciones, setSubsanaciones] = useState({})
  const [formDocumento, setFormDocumento] = useState({
    tipo: 'CuitCertificate',
    venceEl: '',
    archivo: null,
  })

  useEffect(() => {
    obtenerProveedorDeUsuario({ usuarioId: usuario.id })
      .then((data) => {
        setProveedor(data)
        setCargandoDocumentos(true)
        return listarDocumentosProveedor({ proveedorId: data.id })
      })
      .then(setDocumentos)
      .catch((err) => setError(err.message))
      .finally(() => {
        setCargando(false)
        setCargandoDocumentos(false)
      })
  }, [usuario.id])

  if (cargando) return <p className="estado-cargando">Cargando...</p>
  if (error) return <div className="alerta alerta--error">{error}</div>

  const estado = ESTADO[proveedor.estado] ?? ESTADO.pendiente
  const documentosConAlerta = documentos.filter((documento) =>
    ['por_vencer', 'vencido'].includes(documento.estado),
  )

  const manejarCambioDocumento = (event) => {
    const { name, value, files } = event.target
    setFormDocumento((actual) => ({
      ...actual,
      [name]: files ? files[0] : value,
    }))
  }

  const manejarSubmitDocumento = async (event) => {
    event.preventDefault()
    setErrorDocumento('')

    if (!formDocumento.archivo) {
      setErrorDocumento('Selecciona un PDF para cargar.')
      return
    }

    if (!formDocumento.venceEl) {
      setErrorDocumento('Indica la fecha de vencimiento.')
      return
    }

    setSubiendoDocumento(true)
    try {
      const documento = await subirDocumentoProveedor({
        proveedorId: proveedor.id,
        tipo: formDocumento.tipo,
        archivo: formDocumento.archivo,
        venceEl: formDocumento.venceEl,
      })

      setDocumentos((actual) => [documento, ...actual])
      setFormDocumento({
        tipo: 'CuitCertificate',
        venceEl: '',
        archivo: null,
      })
      event.target.reset()
    } catch (err) {
      setErrorDocumento(err.message)
    } finally {
      setSubiendoDocumento(false)
    }
  }

  const manejarSubsanacion = async (documentoId) => {
    const notas = subsanaciones[documentoId]?.trim()
    if (!notas) {
      setErrorDocumento('Escribe una nota de subsanacion.')
      return
    }

    setSubsanandoId(documentoId)
    setErrorDocumento('')
    try {
      const revision = await subsanarDocumentoProveedor({
        documentoId,
        proveedorId: proveedor.id,
        notas,
      })

      setDocumentos((actual) =>
        actual.map((documento) =>
          documento.id === documentoId
            ? {
                ...documento,
                revisiones: [
                  ...documento.revisiones,
                  {
                    id: revision.id,
                    accion: revision.action,
                    dictamen: null,
                    notas: revision.notes,
                    excepcion: revision.exceptionReason,
                    fecha: revision.createdAtUtc,
                  },
                ],
              }
            : documento,
        ),
      )
      setSubsanaciones((actual) => ({ ...actual, [documentoId]: '' }))
    } catch (err) {
      setErrorDocumento(err.message)
    } finally {
      setSubsanandoId(null)
    }
  }

  return (
    <section className="form-pagina proveedor-home">
      <div className="encabezado">
        <h1>Mi cuenta de proveedor</h1>
      </div>

      <div className="form">
        <h2 className="form__titulo">Datos de la empresa</h2>
        <div className="perfil__solo-lectura">
          <span>Razon social: {proveedor.razonSocial}</span>
          <span>CUIT: {proveedor.cuit}</span>
          <span>Email: {usuario.email}</span>
        </div>

        <div className="proveedor__estado">
          <span>Estado:</span>
          <span className={`badge ${estado.clase}`}>{estado.texto}</span>
        </div>

        {proveedor.estado === 'pendiente' && (
          <p className="form__seccion-ayuda">
            Tu cuenta esta creada pero todavia no fue verificada. Una vez verificada
            vas a poder participar de las subastas.
          </p>
        )}
      </div>

      <div className="form">
        <h2 className="form__titulo">Documentacion</h2>

        {documentosConAlerta.length > 0 && (
          <div className="alerta alerta--warning">
            Tenes {documentosConAlerta.length} documento(s) vencidos o por vencer.
          </div>
        )}

        <form className="documentos__form" onSubmit={manejarSubmitDocumento}>
          <label>
            Tipo
            <select name="tipo" value={formDocumento.tipo} onChange={manejarCambioDocumento}>
              {TIPOS_DOCUMENTO.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.texto}
                </option>
              ))}
            </select>
          </label>

          <label>
            Vencimiento
            <input
              name="venceEl"
              type="date"
              value={formDocumento.venceEl}
              onChange={manejarCambioDocumento}
            />
          </label>

          <label>
            PDF
            <input name="archivo" type="file" accept="application/pdf" onChange={manejarCambioDocumento} />
          </label>

          <button type="submit" className="btn btn--primario" disabled={subiendoDocumento}>
            {subiendoDocumento ? 'Cargando...' : 'Subir documento'}
          </button>
        </form>

        {errorDocumento && <div className="alerta alerta--error">{errorDocumento}</div>}

        {cargandoDocumentos ? (
          <p className="estado-cargando">Cargando documentacion...</p>
        ) : documentos.length === 0 ? (
          <p className="form__seccion-ayuda">Todavia no cargaste documentacion global.</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Hash</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                  <th>Dictamen</th>
                  <th>Subsanacion</th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((documento) => {
                  const estadoDocumento = ESTADO_DOCUMENTO[documento.estado] ?? ESTADO_DOCUMENTO.valido
                  const dictamen = documento.dictamen
                    ? DICTAMEN_DOCUMENTO[documento.dictamen]
                    : null
                  return (
                    <tr key={documento.id}>
                      <td>{documento.nombreArchivo}</td>
                      <td className="mono">{documento.hashCorto}</td>
                      <td>{formatearFecha(documento.venceEl)}</td>
                      <td>
                        <span className={`badge ${estadoDocumento.clase}`}>{estadoDocumento.texto}</span>
                      </td>
                      <td>
                        {dictamen ? (
                          <span className={`badge ${dictamen.clase}`}>{dictamen.texto}</span>
                        ) : (
                          <span className="badge badge--off">Sin dictamen</span>
                        )}
                        {documento.revisiones.length > 0 && (
                          <small className="tabla__nota">
                            Ultima revision: {documento.revisiones.at(-1).notas}
                          </small>
                        )}
                      </td>
                      <td>
                        <textarea
                          className="documentos__subsanacion"
                          rows="2"
                          value={subsanaciones[documento.id] ?? ''}
                          onChange={(event) =>
                            setSubsanaciones((actual) => ({
                              ...actual,
                              [documento.id]: event.target.value,
                            }))
                          }
                          placeholder="Responder observacion"
                        />
                        <button
                          className="btn btn--texto"
                          type="button"
                          onClick={() => manejarSubsanacion(documento.id)}
                          disabled={subsanandoId === documento.id}
                        >
                          {subsanandoId === documento.id ? 'Enviando...' : 'Subsanar'}
                        </button>
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
