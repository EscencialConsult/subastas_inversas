import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../context/ToastContext'
import { ESTADO_INFO, etiquetaEstado, claseEstado } from '../../domain/compras'
import { Alert } from '../../shared/ui/Alert'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { DataTable, type DataTableColumn } from '../../shared/ui/DataTable'
import { DatePicker } from '../../shared/ui/DatePicker'
import { FormSection } from '../../shared/ui/FormSection'
import { Input } from '../../shared/ui/Input'
import { PageHeader } from '../../shared/ui/PageHeader'
import { PageShell } from '../../shared/ui/PageShell'
import { Select } from '../../shared/ui/Select'
import { useAuditoria } from './hooks/useAuditoria'
import { TIPOS_EVENTO, Metric, descargarArchivoCsv, formatearFecha, etiquetaSeveridad, claseSeveridad, etiquetaAlcanceIntegridad } from './components/auditoriaListHelpers'
import { Pagination, usePagination } from '../../shared/ui/Pagination'

interface RiesgoProceso {
  procesoId: string
  codigo: string
  titulo: string
  alertas: number
  altas: number
  medias: number
  info: number
}

interface Hallazgo {
  entidadId: string
  alcance: string
  entidad: string
  mensaje: string
  severidad: string
}

export function AuditoriaListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const [emailAcceso, setEmailAcceso] = useState('')
  const [exitoAcceso, setExitoAcceso] = useState('')
  const [severidadAlerta, setSeveridadAlerta] = useState('')

  const [fechaAccesoDesde, setFechaAccesoDesde] = useState('')
  const [fechaAccesoHasta, setFechaAccesoHasta] = useState('')
  const [tipoEventoAcceso, setTipoEventoAcceso] = useState('')

  const {
    procesos,
    accesos,
    alertas,
    panelRiesgo,
    integridad,
    cargando,
    verificandoIntegridad,
    exportandoCsv,
    error,
    ejecutarVerificacionIntegridad,
    exportarCsvFirmado,
  } = useAuditoria({
    tenantId,
    busqueda,
    estado,
    emailAcceso,
    exitoAcceso,
    severidadAlerta,
  })

  const accesosFiltrados = useMemo(() => {
    let items = accesos as unknown as Array<Record<string, unknown>>

    if (tipoEventoAcceso) {
      items = items.filter((row) => row.evento === tipoEventoAcceso)
    }

    if (fechaAccesoDesde) {
      const desde = new Date(fechaAccesoDesde).getTime()
      items = items.filter((row) => {
        const f = new Date(row.fecha as string).getTime()
        return !Number.isNaN(f) && f >= desde
      })
    }

    if (fechaAccesoHasta) {
      const hasta = new Date(fechaAccesoHasta + 'T23:59:59').getTime()
      items = items.filter((row) => {
        const f = new Date(row.fecha as string).getTime()
        return !Number.isNaN(f) && f <= hasta
      })
    }

    return items
  }, [accesos, tipoEventoAcceso, fechaAccesoDesde, fechaAccesoHasta])

  const { paginatedItems: accesosPaginados, setPage: onAccesoPageChange, setPageSize: onAccesoPageSizeChange, ...accesosPaginacion } = usePagination(accesosFiltrados)
  const { paginatedItems: riesgoPaginados, setPage: onRiesgoPageChange, setPageSize: onRiesgoPageSizeChange, ...riesgoPaginacion } = usePagination(panelRiesgo?.procesosRiesgo ?? [])
  const { paginatedItems: hallazgosPaginados, setPage: onHallazgosPageChange, setPageSize: onHallazgosPageSizeChange, ...hallazgosPaginacion } = usePagination(integridad?.hallazgos ?? [])
  const { paginatedItems: alertasPaginadas, setPage: onAlertasPageChange, setPageSize: onAlertasPageSizeChange, ...alertasPaginacion } = usePagination(alertas as unknown as Record<string, unknown>[])
  const { paginatedItems: procesosPaginados, setPage: onProcesosPageChange, setPageSize: onProcesosPageSizeChange, ...procesosPaginacion } = usePagination(procesos as unknown as Record<string, unknown>[])

  async function descargarCsvFirmado() {
    const exportacion = await exportarCsvFirmado()
    if (exportacion) {
      descargarArchivoCsv(exportacion as { contenidoCsv: string; nombreArchivo?: string })
      toast.success('CSV exportado correctamente.')
    }
  }

  const procesoColumns: Array<DataTableColumn<Record<string, unknown>>> = [
    {
      header: 'Código',
      cell: (row) => <code>{row.codigo as string}</code>,
    },
    { header: 'Título', accessor: 'titulo', sortable: true },
    {
      header: 'Estado',
      cell: (row) => <Badge variant={claseEstado(row.estado as string)}>{etiquetaEstado(row.estado as string)}</Badge>,
    },
    {
      header: '',
      align: 'right',
      cell: (row) => (
        <Button variant="link" onClick={() => navigate(`/auditoria/${row.id as string}`)}>
          Ver expediente
        </Button>
      ),
    },
  ]

  const riesgoColumns: Array<DataTableColumn<RiesgoProceso & Record<string, unknown>>> = [
    {
      header: 'Proceso',
      cell: (row) => (
        <div>
          <code>{row.codigo}</code>
          <small className="ml-1 text-text-muted"> {row.titulo}</small>
        </div>
      ),
    },
    { header: 'Alertas', accessor: 'alertas' },
    { header: 'Alta', accessor: 'altas' },
    { header: 'Media', accessor: 'medias' },
    { header: 'Info', accessor: 'info' },
    {
      header: '',
      align: 'right',
      cell: (row) => (
        <Button variant="link" onClick={() => navigate(`/auditoria/${row.procesoId}`)}>
          Ver expediente
        </Button>
      ),
    },
  ]

  const hallazgoColumns: Array<DataTableColumn<Hallazgo & Record<string, unknown>>> = [
    {
      header: 'Severidad',
      cell: (row) => <Badge variant={claseSeveridad(row.severidad)}>{etiquetaSeveridad(row.severidad)}</Badge>,
    },
    {
      header: 'Alcance',
      cell: (row) => etiquetaAlcanceIntegridad(row.alcance),
    },
    {
      header: 'Entidad',
      cell: (row) => (
        <div>
          <span>{row.entidad}</span>
          <small className="ml-1 text-text-muted"> {row.entidadId}</small>
        </div>
      ),
    },
    { header: 'Detalle', accessor: 'mensaje' },
  ]

  const alertaColumns: Array<DataTableColumn<Record<string, unknown>>> = [
    {
      header: 'Severidad',
      cell: (row) => <Badge variant={claseSeveridad(row.severidad as string)}>{etiquetaSeveridad(row.severidad as string)}</Badge>,
    },
    {
      header: 'Proceso',
      cell: (row) => (
        <div>
          <code>{row.codigoProceso as string}</code>
          <small className="ml-1 text-text-muted"> {row.tituloProceso as string}</small>
        </div>
      ),
    },
    { header: 'Alerta', accessor: 'mensaje' },
    {
      header: 'Detectada',
      cell: (row) => formatearFecha(row.detectadaEn as string),
    },
    {
      header: '',
      align: 'right',
      cell: (row) => (
        <Button variant="link" onClick={() => navigate(`/auditoria/${row.procesoId as string}`)}>
          Ver expediente
        </Button>
      ),
    },
  ]

  const accesoColumns: Array<DataTableColumn<Record<string, unknown>>> = [
    {
      header: 'Fecha',
      cell: (row) => formatearFecha(row.fecha as string),
    },
    { header: 'Email', accessor: 'email' },
    { header: 'Evento', accessor: 'eventoTexto' },
    {
      header: 'Resultado',
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant={row.exito ? 'success' : 'error'}>{row.exito ? 'OK' : 'Fallido'}</Badge>
          {row.motivo && <small className="text-text-muted"> {row.motivo as string}</small>}
        </div>
      ),
    },
    { header: 'IP', accessor: 'ip' },
  ]

  return (
    <PageShell width="full">
      <PageHeader
        title="Auditoría"
        actions={
          <Button onClick={descargarCsvFirmado} disabled={exportandoCsv}>
            {exportandoCsv ? 'Exportando...' : 'Exportar CSV firmado'}
          </Button>
        }
      />

      <FormSection title="Filtros de procesos">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <Input
            placeholder="Buscar por código o título…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_INFO).map(([clave, info]) => (
              <option key={clave} value={clave}>
                {info.label}
              </option>
            ))}
          </Select>
        </div>
      </FormSection>

      {error && <Alert variant="error">{error}</Alert>}

      {panelRiesgo && (
        <FormSection
          title="Panel de riesgo"
          actions={
            <Badge variant={panelRiesgo.integridadValida ? 'success' : 'error'}>
              {panelRiesgo.integridadValida ? 'Integridad válida' : 'Integridad con hallazgos'}
            </Badge>
          }
        >
          <dl className="mb-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Metric label="Procesos" value={panelRiesgo.totalProcesos} />
            <Metric label="Subastas" value={panelRiesgo.totalSubastas} />
            <Metric label="Alertas" value={panelRiesgo.totalAlertas} />
            <Metric label="Altas" value={<Badge variant="error">{panelRiesgo.alertasAltas}</Badge>} />
            <Metric label="Medias" value={<Badge variant="warning">{panelRiesgo.alertasMedias}</Badge>} />
            <Metric label="Info" value={<Badge variant="info">{panelRiesgo.alertasInfo}</Badge>} />
            <Metric label="Procesos con alerta" value={panelRiesgo.procesosConAlertas} />
            <Metric
              label="Hallazgos integridad"
              value={
                <Badge variant={panelRiesgo.hallazgosIntegridad > 0 ? 'error' : 'success'}>
                  {panelRiesgo.hallazgosIntegridad}
                </Badge>
              }
            />
          </dl>

          {panelRiesgo.procesosRiesgo.length > 0 && (
            <div>
              <h3 className="mb-3 text-base font-semibold text-text">Procesos con mayor riesgo</h3>
              <DataTable
                columns={riesgoColumns}
                rows={riesgoPaginados as (RiesgoProceso & Record<string, unknown>)[]}
                getRowId={(row) => row.procesoId}
                onRowClick={(row) => navigate(`/auditoria/${row.procesoId}`)}
              />
              <Pagination {...riesgoPaginacion} onPageChange={onRiesgoPageChange} onPageSizeChange={onRiesgoPageSizeChange} />
            </div>
          )}
        </FormSection>
      )}

      <FormSection
        title="Verificación de integridad"
        actions={
          <Button
            onClick={ejecutarVerificacionIntegridad}
            disabled={verificandoIntegridad}
          >
            {verificandoIntegridad ? 'Verificando...' : 'Validar hashes y firmas'}
          </Button>
        }
      >
        {integridad ? (
          <div className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <Metric
                label="Estado"
                value={
                  <Badge variant={integridad.esValida ? 'success' : 'error'}>
                    {integridad.esValida ? 'Integra' : 'Con hallazgos'}
                  </Badge>
                }
              />
              <Metric label="Eventos" value={integridad.eventosAuditoria} />
              <Metric label="Cadenas de lances" value={integridad.cadenasLances} />
              <Metric label="Lances" value={integridad.lances} />
              <Metric label="Firmas" value={integridad.firmas} />
              <Metric label="Documentos" value={integridad.documentos} />
              <Metric label="Verificado" value={formatearFecha(integridad.verificadaEn)} />
            </dl>

            {integridad.hallazgos.length === 0 ? (
              <Alert variant="success">No se detectaron alteraciones en cadenas, hashes o firmas.</Alert>
            ) : (
              <>
                <DataTable
                  columns={hallazgoColumns}
                  rows={hallazgosPaginados as (Hallazgo & Record<string, unknown>)[]}
                  getRowId={(row, idx) => `${row.entidadId}:${row.alcance}:${idx}`}
                />
                <Pagination {...hallazgosPaginacion} onPageChange={onHallazgosPageChange} onPageSizeChange={onHallazgosPageSizeChange} />
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            Ejecuta la validación para recalcular la cadena de auditoría, los hashes de lances y las firmas documentales.
          </p>
        )}
      </FormSection>

      <FormSection
        title="Alertas automáticas de riesgo"
        description={
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-muted">Filtrar por severidad:</span>
            <Select value={severidadAlerta} onChange={(e) => setSeveridadAlerta(e.target.value)}>
              <option value="">Todas las severidades</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="info">Informativa</option>
            </Select>
          </div>
        }
      >
        <DataTable
          columns={alertaColumns}
          rows={alertasPaginadas as unknown as Record<string, unknown>[]}
          loading={cargando}
          getRowId={(row) => `${row.procesoId as string}:${row.codigo as string}`}
          emptyTitle="Sin alertas"
          emptyDescription="No hay alertas automáticas para los filtros seleccionados."
          onRowClick={(row) => navigate(`/auditoria/${row.procesoId as string}`)}
        />
        <Pagination {...alertasPaginacion} onPageChange={onAlertasPageChange} onPageSizeChange={onAlertasPageSizeChange} />
      </FormSection>

      <FormSection
        title="Bitácora de accesos"
        description={
          <div className="flex flex-wrap items-end gap-3">
            <Input
              placeholder="Filtrar por email..."
              value={emailAcceso}
              onChange={(e) => setEmailAcceso(e.target.value)}
            />
            <Select value={exitoAcceso} onChange={(e) => setExitoAcceso(e.target.value)}>
              <option value="">Todos los resultados</option>
              <option value="ok">Exitosos</option>
              <option value="error">Fallidos</option>
            </Select>
            <Select value={tipoEventoAcceso} onChange={(e) => setTipoEventoAcceso(e.target.value)}>
              {TIPOS_EVENTO.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
            <DatePicker
              label="Desde"
              value={fechaAccesoDesde}
              onChange={(e) => setFechaAccesoDesde(e.target.value)}
            />
            <DatePicker
              label="Hasta"
              value={fechaAccesoHasta}
              onChange={(e) => setFechaAccesoHasta(e.target.value)}
            />
          </div>
        }
      >
        <DataTable
          columns={accesoColumns}
          rows={accesosPaginados as unknown as Record<string, unknown>[]}
          loading={cargando}
          getRowId={(row) => row.id as string}
          emptyTitle="Sin accesos"
          emptyDescription="No hay accesos que coincidan con el filtro."
        />
        <Pagination {...accesosPaginacion} onPageChange={onAccesoPageChange} onPageSizeChange={onAccesoPageSizeChange} />
      </FormSection>

      <FormSection title="Procesos">
        <DataTable
          columns={procesoColumns}
          rows={procesosPaginados as unknown as Record<string, unknown>[]}
          loading={cargando}
          getRowId={(row) => row.id as string}
          emptyTitle="Sin procesos"
          emptyDescription="No hay procesos que coincidan con el filtro."
          onRowClick={(row) => navigate(`/auditoria/${row.id as string}`)}
        />
        <Pagination {...procesosPaginacion} onPageChange={onProcesosPageChange} onPageSizeChange={onProcesosPageSizeChange} />
      </FormSection>
    </PageShell>
  )
}
