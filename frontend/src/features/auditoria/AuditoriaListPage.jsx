// Auditoría: el auditor ve TODOS los procesos del tenant, en cualquier estado.
// Es solo lectura: no tiene acciones que modifiquen nada.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Shield, UserCheck } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import {
  exportarAuditoriaCsvFirmado,
  listarAlertasRiesgo,
  listarBitacoraAccesos,
  obtenerPanelRiesgoAuditoria,
  verificarIntegridad,
} from '../../api/auditoriaApi'
import { listarProcesosParaAuditoria } from '../../api/comprasApi'
import {
  ESTADO_INFO,
  etiquetaEstado,
  claseEstado,
} from '../../domain/compras'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { Spinner } from '../../components/ui/Spinner.jsx'

export function AuditoriaListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [procesos, setProcesos] = useState([])
  const [accesos, setAccesos] = useState([])
  const [alertas, setAlertas] = useState([])
  const [panelRiesgo, setPanelRiesgo] = useState(null)
  const [integridad, setIntegridad] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [verificandoIntegridad, setVerificandoIntegridad] = useState(false)
  const [exportandoCsv, setExportandoCsv] = useState(false)
  const [error, setError] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const [emailAcceso, setEmailAcceso] = useState('')
  const [exitoAcceso, setExitoAcceso] = useState('')
  const [severidadAlerta, setSeveridadAlerta] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const lista = await listarProcesosParaAuditoria({ tenantId, busqueda, estado })
      const bitacora = await listarBitacoraAccesos({
        tenantId,
        email: emailAcceso,
        exito: exitoAcceso,
      })
      const riesgos = await listarAlertasRiesgo({
        tenantId,
        severidad: severidadAlerta,
      })
      const panel = await obtenerPanelRiesgoAuditoria({ tenantId })
      setProcesos(lista)
      setAccesos(bitacora)
      setAlertas(riesgos)
      setPanelRiesgo(panel)
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
  }, [tenantId, busqueda, estado, emailAcceso, exitoAcceso, severidadAlerta])

  async function ejecutarVerificacionIntegridad() {
    setVerificandoIntegridad(true)
    setError('')
    try {
      setIntegridad(await verificarIntegridad({ tenantId }))
    } catch (err) {
      setError(err.message)
    } finally {
      setVerificandoIntegridad(false)
    }
  }

  async function descargarCsvFirmado() {
    setExportandoCsv(true)
    setError('')
    try {
      const exportacion = await exportarAuditoriaCsvFirmado({ tenantId })
      descargarArchivoCsv(exportacion)
    } catch (err) {
      setError(err.message)
    } finally {
      setExportandoCsv(false)
    }
  }

  return (
    <section>
      <div className="encabezado">
        <h1>Auditoría</h1>
        <Button
          onClick={descargarCsvFirmado}
          disabled={exportandoCsv}
        >
          {exportandoCsv ? 'Exportando...' : 'Exportar CSV firmado'}
        </Button>
      </div>

      <div className="filtros">
        <input
          className="filtros__busqueda"
          placeholder="Buscar por código o título…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_INFO).map(([clave, info]) => (
            <option key={clave} value={clave}>
              {info.label}
            </option>
          ))}
        </select>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {panelRiesgo && (
        <div className="form">
          <div className="encabezado" style={{ marginBottom: '12px' }}>
            <h2 className="form__titulo">Panel de riesgo</h2>
            <span className={`badge ${panelRiesgo.integridadValida ? 'badge--ok' : 'badge--error'}`}>
              {panelRiesgo.integridadValida ? 'Integridad valida' : 'Integridad con hallazgos'}
            </span>
          </div>

          <div className="auditoria-datos">
            <DatoPanel label="Procesos" valor={panelRiesgo.totalProcesos} />
            <DatoPanel label="Subastas" valor={panelRiesgo.totalSubastas} />
            <DatoPanel label="Alertas" valor={panelRiesgo.totalAlertas} />
            <DatoPanel label="Altas" valor={panelRiesgo.alertasAltas} clase="badge--error" />
            <DatoPanel label="Medias" valor={panelRiesgo.alertasMedias} clase="badge--warn" />
            <DatoPanel label="Info" valor={panelRiesgo.alertasInfo} clase="badge--info" />
            <DatoPanel label="Procesos con alerta" valor={panelRiesgo.procesosConAlertas} />
            <DatoPanel
              label="Hallazgos integridad"
              valor={panelRiesgo.hallazgosIntegridad}
              clase={panelRiesgo.hallazgosIntegridad > 0 ? 'badge--error' : 'badge--ok'}
            />
          </div>

          {panelRiesgo.procesosRiesgo.length > 0 && (
            <>
              <h3 className="form__subtitulo" style={{ marginTop: '16px' }}>Procesos con mayor riesgo</h3>
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Proceso</th>
                    <th>Alertas</th>
                    <th>Alta</th>
                    <th>Media</th>
                    <th>Info</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {panelRiesgo.procesosRiesgo.map((p) => (
                    <tr key={p.procesoId}>
                      <td>
                        <code>{p.codigo}</code>
                        <small className="campo__ayuda"> {p.titulo}</small>
                      </td>
                      <td>{p.alertas}</td>
                      <td>{p.altas}</td>
                      <td>{p.medias}</td>
                      <td>{p.info}</td>
                      <td className="tabla__acciones">
                        <Button variant="link" onClick={() => navigate(`/auditoria/${p.procesoId}`)}>
                          Ver expediente
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      <div className="form">
        <div className="encabezado" style={{ marginBottom: '12px' }}>
          <h2 className="form__titulo">Verificacion de integridad</h2>
          <Button
            type="button"
            onClick={ejecutarVerificacionIntegridad}
            disabled={verificandoIntegridad}
          >
            {verificandoIntegridad ? 'Verificando...' : 'Validar hashes y firmas'}
          </Button>
        </div>

        {integridad ? (
          <>
            <div className="perfil__solo-lectura" style={{ marginBottom: '16px' }}>
              <span>
                Estado:{' '}
                <strong className={`badge ${integridad.esValida ? 'badge--ok' : 'badge--error'}`}>
                  {integridad.esValida ? 'Integra' : 'Con hallazgos'}
                </strong>
              </span>
              <span>Eventos: <strong>{integridad.eventosAuditoria}</strong></span>
              <span>Cadenas de lances: <strong>{integridad.cadenasLances}</strong></span>
              <span>Lances: <strong>{integridad.lances}</strong></span>
              <span>Firmas: <strong>{integridad.firmas}</strong></span>
              <span>Documentos: <strong>{integridad.documentos}</strong></span>
              <span>Verificado: <strong>{formatearFecha(integridad.verificadaEn)}</strong></span>
            </div>

            {integridad.hallazgos.length === 0 ? (
              <Alert variant="success">No se detectaron alteraciones en cadenas, hashes o firmas.</Alert>
            ) : (
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Severidad</th>
                    <th>Alcance</th>
                    <th>Entidad</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {integridad.hallazgos.map((hallazgo, index) => (
                    <tr key={`${hallazgo.entidadId}:${hallazgo.alcance}:${index}`}>
                      <td>
                        <span className={`badge ${claseSeveridad(hallazgo.severidad)}`}>
                          {etiquetaSeveridad(hallazgo.severidad)}
                        </span>
                      </td>
                      <td>{etiquetaAlcanceIntegridad(hallazgo.alcance)}</td>
                      <td>
                        {hallazgo.entidad}
                        <small className="campo__ayuda"> {hallazgo.entidadId}</small>
                      </td>
                      <td>{hallazgo.mensaje}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          <p className="form__seccion-ayuda">
            Ejecuta la validacion para recalcular la cadena de auditoria, los hashes de lances y las firmas documentales.
          </p>
        )}
      </div>

      <div className="encabezado auditoria__subheader">
        <h2 className="form__titulo">Alertas automaticas de riesgo</h2>
      </div>

      <div className="filtros">
        <select value={severidadAlerta} onChange={(e) => setSeveridadAlerta(e.target.value)}>
          <option value="">Todas las severidades</option>
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="info">Informativa</option>
        </select>
      </div>

      {!cargando && alertas.length === 0 ? (
        <EmptyState icon={Shield} title="Sin alertas" description="No hay alertas automaticas para los filtros seleccionados." />
      ) : (
        !cargando && (
          <table className="tabla">
            <thead>
              <tr>
                <th>Severidad</th>
                <th>Proceso</th>
                <th>Alerta</th>
                <th>Detectada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {alertas.map((a) => (
                <tr key={`${a.procesoId}:${a.codigo}`}>
                  <td>
                    <span className={`badge ${claseSeveridad(a.severidad)}`}>
                      {etiquetaSeveridad(a.severidad)}
                    </span>
                  </td>
                  <td>
                    <code>{a.codigoProceso}</code>
                    <small className="campo__ayuda"> {a.tituloProceso}</small>
                  </td>
                  <td>{a.mensaje}</td>
                  <td>{formatearFecha(a.detectadaEn)}</td>
                  <td className="tabla__acciones">
                    <Button
                      variant="link"
                      onClick={() => navigate(`/auditoria/${a.procesoId}`)}
                    >
                      Ver expediente
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {cargando ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : procesos.length === 0 ? (
        <EmptyState icon={FileText} title="Sin procesos" description="No hay procesos que coincidan con el filtro." />
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Código</th>
              <th>Título</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {procesos.map((p) => (
              <tr key={p.id}>
                <td>
                  <code>{p.codigo}</code>
                </td>
                <td>{p.titulo}</td>
                <td>
                  <Badge variant={claseEstado(p.estado)}>{etiquetaEstado(p.estado)}</Badge>
                </td>
                <td className="tabla__acciones">
                  <Button
                    variant="link"
                    onClick={() => navigate(`/auditoria/${p.id}`)}
                  >
                    Ver expediente
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="encabezado auditoria__subheader">
        <h2 className="form__titulo">Bitacora de accesos</h2>
      </div>

      <div className="filtros">
        <input
          className="filtros__busqueda"
          placeholder="Filtrar por email..."
          value={emailAcceso}
          onChange={(e) => setEmailAcceso(e.target.value)}
        />
        <select value={exitoAcceso} onChange={(e) => setExitoAcceso(e.target.value)}>
          <option value="">Todos los resultados</option>
          <option value="ok">Exitosos</option>
          <option value="error">Fallidos</option>
        </select>
      </div>

      {!cargando && accesos.length === 0 ? (
        <EmptyState icon={UserCheck} title="Sin accesos" description="No hay accesos que coincidan con el filtro." />
      ) : (
        !cargando && (
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Email</th>
                <th>Evento</th>
                <th>Resultado</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {accesos.map((a) => (
                <tr key={a.id}>
                  <td>{formatearFecha(a.fecha)}</td>
                  <td>{a.email || '-'}</td>
                  <td>{a.eventoTexto}</td>
                  <td>
                    <span className={a.exito ? 'badge badge--ok' : 'badge badge--error'}>
                      {a.exito ? 'OK' : 'Fallido'}
                    </span>
                    {a.motivo && <small className="campo__ayuda"> {a.motivo}</small>}
                  </td>
                  <td>{a.ip || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </section>
  )
}

function DatoPanel({ label, valor, clase = '' }) {
  return (
    <div className="auditoria-dato">
      <span className="auditoria-dato__label">{label}</span>
      <span className="auditoria-dato__valor">
        {clase ? <span className={`badge ${clase}`}>{valor}</span> : valor}
      </span>
    </div>
  )
}

function descargarArchivoCsv(exportacion) {
  const blob = new Blob(['\ufeff' + exportacion.contenidoCsv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportacion.nombreArchivo || 'auditoria-firmada.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function formatearFecha(fecha) {
  if (!fecha) return '-'
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(fecha))
}

function etiquetaSeveridad(severidad) {
  return {
    high: 'Alta',
    medium: 'Media',
    info: 'Info',
  }[severidad] ?? severidad
}

function claseSeveridad(severidad) {
  return {
    high: 'badge--error',
    medium: 'badge--warn',
    info: 'badge--info',
  }[severidad] ?? 'badge--off'
}

function etiquetaAlcanceIntegridad(alcance) {
  return {
    audit_chain: 'Cadena de auditoria',
    bid_chain: 'Cadena de lances',
    auction_closing_act: 'Acta de cierre',
    evaluation_act: 'Acta de evaluacion',
    award: 'Adjudicacion',
    contract_signature: 'Contrato',
  }[alcance] ?? alcance
}
