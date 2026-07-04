import { analisisSubasta } from '../../../shared/api/subastasApi'
import { claseEstado, etiquetaEstado } from '../../../domain/compras'
import { Alert } from '../../../shared/ui/Alert'
import { Badge } from '../../../shared/ui/Badge'

interface AuditoriaDetailSectionsProps {
  proceso: any
  subasta: any
  invitaciones: any[]
  evalResults: any
  alertasRiesgo: any[]
  nombres: Record<string, string>
}

export function AuditoriaDetailSections({
  proceso,
  subasta,
  invitaciones,
  evalResults,
  alertasRiesgo,
  nombres,
}: AuditoriaDetailSectionsProps) {
  const nombre = (idUsuario: string) => nombres[idUsuario] ?? '---'
  const estadoAprobacion = proceso.aprobacion?.estado
  const claseAdjudicacion = estadoAprobacion === 'rechazada' ? 'auditoria-seccion--rechazo' : 'auditoria-seccion--adjudicacion'
  const claseAprobacion = estadoAprobacion === 'rechazada' ? 'auditoria-seccion--rechazo' : 'auditoria-seccion--aprobacion'

  return (
    <>
      <Alert variant="info">Vista de auditoria: solo lectura. No se puede modificar nada desde aca.</Alert>
      <AlertasRiesgoSection alertas={alertasRiesgo} />
      <LineaDeTiempo proceso={proceso} subasta={subasta} invitaciones={invitaciones} evalResults={evalResults} />
      <DatosProcesoSection proceso={proceso} nombre={nombre} />
      <ItemsProcesoSection items={proceso.items ?? []} />
      <InvitacionesSection invitaciones={invitaciones} />
      <SubastaSection subasta={subasta} />
      <EvaluacionSection evalResults={evalResults} />
      <AdjudicacionSection proceso={proceso} nombre={nombre} className={claseAdjudicacion} />
      <AprobacionSection proceso={proceso} nombre={nombre} className={claseAprobacion} />
    </>
  )
}

function AlertasRiesgoSection({ alertas }: { alertas: any[] }) {
  if (alertas.length === 0) return null

  return (
    <div className="rounded-md border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-text">Alertas automaticas de riesgo</h2>
      <table className="min-w-full divide-y divide-border text-sm">
        <thead>
          <tr>
            <th>Severidad</th>
            <th>Tipo</th>
            <th>Detalle</th>
            <th>Metrica</th>
          </tr>
        </thead>
        <tbody>
          {alertas.map((alerta) => (
            <tr key={`${alerta.codigo}:${alerta.detectadaEn}`}>
              <td>
                <span className={`badge ${claseSeveridad(alerta.severidad)}`}>
                  {etiquetaSeveridad(alerta.severidad)}
                </span>
              </td>
              <td>{etiquetaAlerta(alerta.codigo)}</td>
              <td>{alerta.mensaje}</td>
              <td>
                {alerta.valor === null || alerta.valor === undefined
                  ? '---'
                  : `${alerta.valor}${alerta.unidad ? ` ${alerta.unidad}` : ''}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DatosProcesoSection({ proceso, nombre }: { proceso: any; nombre: (id: string) => string }) {
  return (
    <div className="rounded-md border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-text">Datos del proceso</h2>
      <div className="auditoria-datos">
        <div className="auditoria-dato auditoria-dato--full">
          <span className="auditoria-dato__label">Titulo</span>
          <span className="auditoria-dato__valor">{proceso.titulo}</span>
        </div>
        <div className="auditoria-dato auditoria-dato--full">
          <span className="auditoria-dato__label">Descripcion</span>
          <span className="auditoria-dato__valor">{proceso.descripcion || '---'}</span>
        </div>
        <div className="auditoria-dato">
          <span className="auditoria-dato__label">Presupuesto estimado</span>
          <span className="auditoria-dato__valor">{formatearPesos(proceso.presupuestoEstimado)}</span>
        </div>
        <div className="auditoria-dato">
          <span className="auditoria-dato__label">Creado el</span>
          <span className="auditoria-dato__valor">{proceso.creadoEn}</span>
        </div>
        <div className="auditoria-dato">
          <span className="auditoria-dato__label">Comprador</span>
          <span className="auditoria-dato__valor">{nombre(proceso.compradorId)}</span>
        </div>
        <div className="auditoria-dato">
          <span className="auditoria-dato__label">Estado actual</span>
          <span className="auditoria-dato__valor">
            <Badge variant={claseEstado(proceso.estado)}>{etiquetaEstado(proceso.estado)}</Badge>
          </span>
        </div>
        {proceso.specificationsHash && (
          <div className="auditoria-dato auditoria-dato--full">
            <span className="auditoria-dato__label">Hash de Especificaciones</span>
            <span className="auditoria-dato__valor"><code>{proceso.specificationsHash}</code></span>
          </div>
        )}
      </div>
    </div>
  )
}

function ItemsProcesoSection({ items }: { items: any[] }) {
  if (items.length === 0) return null

  return (
    <div className="rounded-md border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-text">Items ({items.length})</h2>
      <table className="min-w-full divide-y divide-border text-sm">
        <thead>
          <tr>
            <th>Descripcion</th>
            <th>Cantidad</th>
            <th>Unidad</th>
            <th>Precio Unitario Est.</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, idx: number) => (
            <tr key={item.id ?? idx}>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td>{item.unit}</td>
              <td>{item.estimatedUnitPrice ? formatearPesos(Number(item.estimatedUnitPrice)) : '---'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InvitacionesSection({ invitaciones }: { invitaciones: any[] }) {
  if (invitaciones.length === 0) return null

  return (
    <div className="rounded-md border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-text">Invitaciones ({invitaciones.length})</h2>
      <table className="min-w-full divide-y divide-border text-sm">
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>CUIT</th>
            <th>Estado</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {invitaciones.map((inv) => {
            const est = inv.estado === 'pendiente' ? { texto: 'Pendiente', clase: 'badge--warn' } :
              inv.estado === 'aceptada' ? { texto: 'Aceptada', clase: 'badge--ok' } :
                { texto: 'Rechazada', clase: 'badge--error' }
            return (
              <tr key={inv.id}>
                <td>{inv.proveedor}</td>
                <td><code>{inv.cuit}</code></td>
                <td><span className={`badge ${est.clase}`}>{est.texto}</span></td>
                <td>
                  {inv.estado === 'rechazada' && inv.rejectionReason
                    ? `Rechazado: ${inv.rejectionReason}`
                    : inv.estado === 'aceptada'
                      ? 'Confirmado'
                      : 'Esperando respuesta'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SubastaSection({ subasta }: { subasta: any }) {
  if (!subasta) return null
  const a = analisisSubasta(subasta)

  return (
    <div className="rounded-md border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-text">Subasta</h2>
      <div className="auditoria-datos">
        <Metric label="Proveedores que ofertaron" value={a.oferentes} />
        <Metric label="Lances totales" value={a.cantidadLances} />
        <Metric label="Presupuesto base" value={formatearPesos(a.base)} />
        <Metric label="Mejor oferta" value={formatearPesos(a.mejor)} />
        <Metric
          label="Baja lograda"
          value={`${a.bajaPorcentaje.toFixed(1)}% (${a.nivelBaja === 'alta' ? 'baja alta' : a.nivelBaja === 'moderada' ? 'baja moderada' : 'baja chica'})`}
        />
      </div>
      {subasta.lances?.length > 0 && (
        <>
          <h3 className="text-base font-semibold text-text">Lances ({subasta.lances.length})</h3>
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {[...subasta.lances]
                .sort((left: any, right: any) => left.monto - right.monto)
                .map((lance: any) => (
                  <tr key={lance.id}>
                    <td>{lance.proveedor}</td>
                    <td>{formatearPesos(lance.monto)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

function EvaluacionSection({ evalResults }: { evalResults: any }) {
  if (!evalResults?.supplierEvaluations?.length) return null

  const exclusionaryCriteria = evalResults.criteria?.filter((c: any) => c.type === 'Exclusionary') ?? []
  const weightedCriteria = evalResults.criteria?.filter((c: any) => c.type === 'Weighted') ?? []

  return (
    <div className="rounded-md border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-text">Evaluacion con Criterios</h2>
      {evalResults.criteria?.length > 0 && (
        <div className="auditoria-datos" style={{ marginBottom: '12px' }}>
          <div className="auditoria-dato auditoria-dato--full">
            <span className="auditoria-dato__label">Criterios definidos</span>
            <span className="auditoria-dato__valor">
              {exclusionaryCriteria.length > 0 && (
                <span>Excluyentes: {exclusionaryCriteria.map((c: any) => c.name).join(', ')}</span>
              )}
              {weightedCriteria.length > 0 && (
                <span style={{ marginLeft: exclusionaryCriteria.length > 0 ? '16px' : 0 }}>
                  Ponderados: {weightedCriteria.map((c: any) => `${c.name} (${c.weight}%)`).join(', ')}
                </span>
              )}
            </span>
          </div>
        </div>
      )}
      <table className="min-w-full divide-y divide-border text-sm">
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Score</th>
            <th>Excluido</th>
          </tr>
        </thead>
        <tbody>
          {evalResults.supplierEvaluations.map((evaluation: any) => (
            <tr key={evaluation.id}>
              <td>{evaluation.supplierName}</td>
              <td>{evaluation.isExcluded ? '---' : `${evaluation.totalWeightedScore ?? 0}%`}</td>
              <td>
                {evaluation.isExcluded ? (
                  <Badge variant="error" className="cursor-help" title={evaluation.excludedReason || ''}>Si</Badge>
                ) : (
                  <Badge variant="success">No</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AdjudicacionSection({ proceso, nombre, className }: { proceso: any; nombre: (id: string) => string; className: string }) {
  if (!proceso.adjudicacion) return null

  return (
    <div className={`rounded-md border border-border bg-surface p-5 shadow-sm ${className}`}>
      <h2 className="text-lg font-semibold text-text">Adjudicacion</h2>
      <div className="auditoria-datos">
        <Metric label="Adjudicado a" value={proceso.adjudicacion.proveedor} full />
        <Metric label="Monto" value={formatearPesos(proceso.adjudicacion.monto)} />
        <Metric label="Propuesto por" value={nombre(proceso.adjudicacion.compradorId)} />
        <Metric label="Fecha" value={proceso.adjudicacion.fecha} />
      </div>
    </div>
  )
}

function AprobacionSection({ proceso, nombre, className }: { proceso: any; nombre: (id: string) => string; className: string }) {
  if (!proceso.aprobacion) return null

  return (
    <div className={`rounded-md border border-border bg-surface p-5 shadow-sm ${className}`}>
      <h2 className="text-lg font-semibold text-text">Aprobacion de la Autoridad</h2>
      <div className="auditoria-datos">
        <Metric label="Resultado" value={proceso.aprobacion.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'} />
        <Metric label="Por" value={nombre(proceso.aprobacion.autoridadId)} />
        <Metric label="Fecha" value={proceso.aprobacion.fecha} />
        {proceso.aprobacion.motivo && <Metric label="Motivo" value={proceso.aprobacion.motivo} full />}
      </div>
    </div>
  )
}

function Metric({ label, value, full = false }: { label: string; value: unknown; full?: boolean }) {
  return (
    <div className={`auditoria-dato ${full ? 'auditoria-dato--full' : ''}`}>
      <span className="auditoria-dato__label">{label}</span>
      <span className="auditoria-dato__valor">{String(value ?? '---')}</span>
    </div>
  )
}

function LineaDeTiempo({ proceso, subasta, invitaciones, evalResults }: any) {
  const eventos = [{ fecha: proceso.creadoEn, texto: 'Proceso creado', tipo: 'creado' }]

  if (invitaciones?.length > 0) {
    eventos.push({
      fecha: invitaciones[0].invitadoEn?.slice(0, 10) ?? proceso.creadoEn,
      texto: `Invitaciones enviadas a ${invitaciones.length} proveedores`,
      tipo: 'invitacion',
    })
  }

  if (subasta) {
    eventos.push({
      fecha: subasta.inicioISO.slice(0, 10),
      texto: `Subasta realizada (${subasta.lances.length} lances)`,
      tipo: 'subasta',
    })
  }

  if (evalResults?.supplierEvaluations?.length > 0) {
    eventos.push({
      fecha: evalResults.supplierEvaluations[0].evaluatedAtUtc?.slice(0, 10) ?? proceso.creadoEn,
      texto: `Evaluacion registrada (${evalResults.supplierEvaluations.filter((e: any) => !e.isExcluded).length} aptos)`,
      tipo: 'evaluacion',
    })
  }

  if (proceso.adjudicacion) {
    eventos.push({
      fecha: proceso.adjudicacion.fecha,
      texto: `Adjudicado a ${proceso.adjudicacion.proveedor}`,
      tipo: 'adjudicacion',
    })
  }

  if (proceso.aprobacion) {
    eventos.push({
      fecha: proceso.aprobacion.fecha,
      texto: proceso.aprobacion.estado === 'aprobada'
        ? 'Adjudicacion aprobada por la Autoridad'
        : 'Adjudicacion rechazada por la Autoridad',
      tipo: 'aprobacion',
    })
  }

  eventos.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))

  return (
    <div className="rounded-md border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-text">Linea de tiempo</h2>
      <ol className="timeline">
        {eventos.map((event, index) => (
          <li key={index} className={`timeline__item timeline__item--${event.tipo}`}>
            <span className="timeline__fecha">{event.fecha}</span>
            <span className="timeline__texto">{event.texto}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function formatearPesos(monto: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}

function etiquetaSeveridad(severidad: string) {
  const map: Record<string, string> = {
    high: 'Alta',
    medium: 'Media',
    info: 'Info',
  }
  return map[severidad] ?? severidad
}

function claseSeveridad(severidad: string) {
  const map: Record<string, string> = {
    high: 'badge--error',
    medium: 'badge--warn',
    info: 'badge--info',
  }
  return map[severidad] ?? 'badge--off'
}

function etiquetaAlerta(codigo: string) {
  const map: Record<string, string> = {
    single_offerer: 'Un solo oferente',
    bid_concentration: 'Concentracion',
    minimal_difference: 'Diferencia minima',
    pab: 'PAB',
    no_bids: 'Sin lances',
  }
  return map[codigo] ?? codigo
}
