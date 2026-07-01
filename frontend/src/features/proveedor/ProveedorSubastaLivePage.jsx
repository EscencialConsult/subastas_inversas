import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { obtenerProveedorDeUsuario, obtenerSubastaProveedor, realizarLance } from '../../api/proveedoresApi'
import { crearConexionSubastas } from '../../api/subastasRealtime'
import { useAuth } from '../../auth/AuthContext'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner.jsx'

export function ProveedorSubastaLivePage() {
  const { auctionId } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [proveedor, setProveedor] = useState(null)
  const [subasta, setSubasta] = useState(null)
  const [monto, setMonto] = useState('')
  const [cargando, setCargando] = useState(true)
  const [ofertando, setOfertando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [conexion, setConexion] = useState('Conectando')
  const [ahoraMs, setAhoraMs] = useState(() => Date.now())

  const cargar = useCallback(async () => {
    setError('')
    try {
      const proveedorActual = proveedor ?? await obtenerProveedorDeUsuario({ usuarioId: usuario.id })
      if (!proveedor) setProveedor(proveedorActual)
      const subastaActual = await obtenerSubastaProveedor({ proveedorId: proveedorActual.id, auctionId })
      setSubasta(subastaActual)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }, [auctionId, proveedor, usuario.id])

  useEffect(() => {
    const timeout = setTimeout(cargar, 0)
    return () => clearTimeout(timeout)
  }, [cargar])

  useEffect(() => {
    const intervalo = setInterval(() => setAhoraMs(Date.now()), 1000)
    return () => clearInterval(intervalo)
  }, [])

  useEffect(() => {
    if (!auctionId) return undefined

    const connection = crearConexionSubastas()
    let activa = true

    connection.onreconnecting(() => setConexion('Reconectando'))
    connection.onreconnected(async () => {
      setConexion('En vivo')
      await connection.invoke('JoinAuctionRoom', auctionId)
    })
    connection.onclose(() => setConexion('Desconectada'))

    connection.on('BidPlaced', (bid) => {
      setSubasta((actual) => {
        if (!actual || bid.auctionId !== actual.id) return actual
        const lance = mapLanceRealtime(bid)
        const yaExiste = actual.lances.some((item) => item.id === lance.id)
        const lances = yaExiste ? actual.lances : [...actual.lances, lance]
        return {
          ...actual,
          precioActual: Math.min(actual.precioActual, lance.monto),
          finISO: lance.subastaFinISO ?? actual.finISO,
          lances,
        }
      })
      setMensaje(bid.auctionExtended ? 'Nuevo lance registrado. El cierre fue extendido automaticamente.' : 'Nuevo lance registrado en vivo.')
    })

    connection.on('AuctionUpdated', (auction) => {
      if (auction.id !== auctionId) return
      setSubasta((actual) => actual ? {
        ...actual,
        precioActual: auction.currentPrice,
        estado: normalizarEstado(auction.status),
        finISO: auction.endsAtUtc,
      } : actual)
    })

    connection.on('AuctionClosed', () => {
      setSubasta((actual) => actual ? { ...actual, estado: 'Closed' } : actual)
    })

    connection
      .start()
      .then(async () => {
        if (!activa) return
        await connection.invoke('JoinAuctionRoom', auctionId)
        setConexion('En vivo')
      })
      .catch((err) => {
        if (!activa) return
        setConexion('Sin conexion')
        setError(err.message)
      })

    return () => {
      activa = false
      connection.invoke('LeaveAuctionRoom', auctionId).catch(() => {})
      connection.stop().catch(() => {})
    }
  }, [auctionId])

  const mejorOferta = useMemo(() => {
    if (!subasta) return 0
    if (!subasta.lances.length) return subasta.precioBase
    return Math.min(...subasta.lances.map((lance) => Number(lance.monto)))
  }, [subasta])

  if (cargando) return <div className="flex justify-center py-12"><Spinner /></div>
  if (error && !subasta) return <Alert variant="error">{error}</Alert>
  if (!subasta || !proveedor) return <Alert variant="error">No se pudo cargar la subasta.</Alert>

  const inicioMs = new Date(subasta.inicioISO).getTime()
  const finMs = new Date(subasta.finISO).getTime()
  const abierta = subasta.estado === 'Open' && ahoraMs >= inicioMs && ahoraMs <= finMs
  const minimoPermitido = mejorOferta * (1 - Number(subasta.decrementoMinimo || 0) / 100)
  const ofertaNumerica = Number(monto)
  const esPab = Number.isFinite(ofertaNumerica) && subasta.pabThreshold > 0 && ofertaNumerica < subasta.pabThreshold
  const lancesOrdenados = [...subasta.lances].sort((a, b) => b.secuencia - a.secuencia)

  async function enviarLance(event) {
    event.preventDefault()
    setError('')
    setMensaje('')

    if (!abierta) {
      setError('La subasta no esta abierta para recibir lances.')
      return
    }
    if (!Number.isFinite(ofertaNumerica) || ofertaNumerica <= 0) {
      setError('Ingresa un monto valido.')
      return
    }

    setOfertando(true)
    try {
      const bid = await realizarLance({
        tenantId: subasta.tenantId,
        auctionId: subasta.id,
        supplierId: proveedor.id,
        monto: ofertaNumerica,
      })
      setSubasta((actual) => {
        if (!actual) return actual
        const yaExiste = actual.lances.some((item) => item.id === bid.id)
        const lances = yaExiste ? actual.lances : [...actual.lances, bid]
        return {
          ...actual,
          precioActual: Math.min(actual.precioActual, bid.monto),
          finISO: bid.subastaFinISO ?? actual.finISO,
          lances,
        }
      })
      setMonto('')
      setMensaje(bid.subastaExtendida ? 'Lance registrado. El cierre fue extendido automaticamente.' : 'Lance registrado con timestamp de servidor.')
    } catch (err) {
      setError(err.message)
    } finally {
      setOfertando(false)
    }
  }

  return (
    <section className="form-pagina proveedor-home">
      <div className="encabezado">
        <div>
          <h1>Sala en vivo</h1>
          <p className="form__seccion-ayuda">
            <code>{subasta.codigo}</code> {subasta.titulo}
          </p>
        </div>
        <button className="btn btn--texto" type="button" onClick={() => navigate('/proveedor/oportunidades')}>
          Volver
        </button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {mensaje && <Alert variant="info">{mensaje}</Alert>}

      <div className="subasta__panel">
        <MetricCard etiqueta="Conexion" valor={conexion} />
        <MetricCard etiqueta="Estado" valor={abierta ? 'Abierta' : etiquetaEstado(subasta.estado)} />
        <MetricCard etiqueta="Mejor oferta" valor={formatearPesos(mejorOferta)} destacado />
        <MetricCard etiqueta="Minimo valido" valor={formatearPesos(minimoPermitido)} />
      </div>

      <form className="form" onSubmit={enviarLance}>
        <div className="grid grid-cols-3 gap-3">
          <div className="form__grupo">
            <label className="form__label">Nuevo lance</label>
            <input
              className="form__control"
              type="number"
              min="0"
              step="0.01"
              value={monto}
              onChange={(event) => setMonto(event.target.value)}
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
              {lancesOrdenados.map((lance) => (
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
              {lancesOrdenados.length === 0 && (
                <tr>
                  <td colSpan="5">Todavia no hay lances registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
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

function mapLanceRealtime(bid) {
  return {
    id: bid.id,
    subastaId: bid.auctionId,
    proveedorId: bid.supplierId,
    proveedor: bid.supplierName,
    monto: bid.amount,
    fechaServidor: bid.placedAtUtc,
    hace: formatearFecha(bid.placedAtUtc),
    isPab: Boolean(bid.isPab),
    subastaFinISO: bid.auctionEndsAtUtc ?? null,
    subastaExtendida: Boolean(bid.auctionExtended),
    secuencia: bid.sequenceNumber ?? 0,
    hashPrevio: bid.previousHash ?? '',
    hash: bid.hash ?? '',
  }
}

function normalizarEstado(estado) {
  if (estado === 0) return 'Open'
  if (estado === 1) return 'Closed'
  if (estado === 2) return 'Scheduled'
  return estado
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
