import { Badge } from '../../../shared/ui/Badge'

export function SubastaLiveMetrics({ conexion, abierta, estado, mejorOferta, minimoPermitido }) {
  return (
    <div className="subasta__panel">
      <MetricCard etiqueta="Conexion" valor={conexion} />
      <MetricCard etiqueta="Estado" valor={abierta ? 'Abierta' : etiquetaEstado(estado)} />
      <MetricCard etiqueta="Mejor oferta" valor={formatearPesos(mejorOferta)} destacado />
      <MetricCard etiqueta="Minimo valido" valor={formatearPesos(minimoPermitido)} />
    </div>
  )
}

export function LanceForm({
  abierta,
  ofertando,
  monto,
  esPab,
  onMontoChange,
  onSubmit,
}) {
  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="grid grid-cols-3 gap-3">
        <div className="form__grupo">
          <label className="form__label">Nuevo lance</label>
          <input
            className="form__control"
            type="number"
            min="0"
            step="0.01"
            value={monto}
            onChange={(event) => onMontoChange(event.target.value)}
            disabled={!abierta || ofertando}
            placeholder="Monto"
          />
        </div>
        <div className="form__grupo">
          <span className="form__label">PAB</span>
          <strong className={`badge ${esPab ? 'badge--error' : 'badge--ok'}`}>
            {esPab ? 'Oferta PAB' : 'Sin marca PAB'}
          </strong>
        </div>
        <div className="form__grupo">
          <span className="form__label">Timestamp</span>
          <span className="campo__ayuda">Lo asigna el servidor al registrar.</span>
        </div>
      </div>
      <div className="tabla__acciones">
        <button className="btn btn--primario" type="submit" disabled={!abierta || ofertando}>
          {ofertando ? 'Enviando...' : 'Registrar lance'}
        </button>
      </div>
    </form>
  )
}

export function LancesTable({ lances }) {
  return (
    <div className="form">
      <h2 className="form__titulo">Lances</h2>
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Proveedor</th>
              <th>Monto</th>
              <th>Servidor</th>
              <th>Hash</th>
            </tr>
          </thead>
          <tbody>
            {lances.map((lance) => (
              <tr key={lance.id}>
                <td>{lance.secuencia}</td>
                <td>{lance.proveedor}</td>
                <td>
                  {formatearPesos(lance.monto)}{' '}
                  {lance.isPab && <Badge variant="error">PAB</Badge>}
                </td>
                <td>{formatearFecha(lance.fechaServidor)}</td>
                <td>
                  <code title={lance.hash}>{lance.hash ? lance.hash.slice(0, 12) : '---'}</code>
                </td>
              </tr>
            ))}
            {lances.length === 0 && (
              <tr>
                <td colSpan="5">Todavia no hay lances registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MetricCard({ etiqueta, valor, destacado = false }) {
  return (
    <article className="subasta__card">
      <span className="subasta__label">{etiqueta}</span>
      <span className={`subasta__valor ${destacado ? 'subasta__valor--destacado' : ''}`}>{valor}</span>
    </article>
  )
}

function etiquetaEstado(estado) {
  if (estado === 'Scheduled') return 'Programada'
  if (estado === 'Open') return 'Abierta'
  if (estado === 'Closed') return 'Cerrada'
  return estado
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(monto ?? 0))
}

function formatearFecha(fechaIso) {
  if (!fechaIso) return '---'
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(fechaIso))
}
