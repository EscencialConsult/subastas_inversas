import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import {
  type LanceMapped,
  type SubastaProveedorMapped,
} from '../../../shared/api/proveedoresApi'
import { crearConexionSubastas } from '../../../shared/api/subastasRealtime'
import { useAuth } from '../../../auth/AuthContext'
import { getErrorMessage } from '../../../shared/query/queryClient'
import { Alert } from '../../../shared/ui/Alert'
import { Button } from '../../../shared/ui/Button'
import { LoadingState } from '../../../shared/ui/StateViews'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PageShell } from '../../../shared/ui/PageShell'
import { LanceForm, LancesTable, SubastaLiveMetrics } from '../components/ProveedorSubastaLiveSections'
import {
  proveedoresKeys,
  proveedorSubastaLiveQuery,
  realizarLanceProveedorMutation,
} from '../data/proveedoresData'

interface RealtimeBid {
  id: string
  auctionId: string
  supplierId: string
  supplierName: string
  amount: number
  placedAtUtc: string
  isPab?: boolean
  auctionEndsAtUtc?: string | null
  auctionExtended?: boolean
  sequenceNumber?: number
  previousHash?: string
  hash?: string
}

interface RealtimeAuctionUpdate {
  id: string
  currentPrice: number
  status: string | number
  endsAtUtc: string
}

export function ProveedorSubastaLivePage() {
  const { auctionId } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const queryClient = useQueryClient()

  const [subasta, setSubasta] = useState<SubastaProveedorMapped | null>(null)
  const [monto, setMonto] = useState('')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [conexion, setConexion] = useState('Conectando')
  const [ahoraMs, setAhoraMs] = useState(() => Date.now())

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: proveedoresKeys.supplierAuction(usuario?.id, auctionId),
    queryFn: () => proveedorSubastaLiveQuery({ usuarioId: usuario?.id, auctionId }),
    enabled: Boolean(usuario?.id && auctionId),
  })

  useEffect(() => {
    if (data?.subasta) setSubasta(data.subasta)
  }, [data?.subasta])

  const registrarLance = useMutation({
    mutationFn: realizarLanceProveedorMutation,
    onMutate: () => {
      setError('')
      setMensaje('')
    },
    onSuccess: async (bid) => {
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
      await queryClient.invalidateQueries({ queryKey: proveedoresKeys.supplierAuction(usuario?.id, auctionId) })
      await queryClient.invalidateQueries({ queryKey: proveedoresKeys.opportunities(data?.proveedor.id) })
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

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

    connection.on('BidPlaced', (bid: RealtimeBid) => {
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

    connection.on('AuctionUpdated', (auction: RealtimeAuctionUpdate) => {
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
      .catch((err: unknown) => {
        if (!activa) return
        setConexion('Sin conexion')
        setError(getErrorMessage(err))
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

  if (isLoading) return <LoadingState label="Cargando sala en vivo..." />

  if ((loadError || error) && !subasta) {
    return (
      <PageShell>
        <Alert variant="error">{getErrorMessage(loadError ?? error, 'No se pudo cargar la subasta.')}</Alert>
      </PageShell>
    )
  }

  if (!subasta || !data?.proveedor) {
    return (
      <PageShell>
        <Alert variant="error">No se pudo cargar la subasta.</Alert>
      </PageShell>
    )
  }

  const inicioMs = new Date(subasta.inicioISO).getTime()
  const finMs = new Date(subasta.finISO).getTime()
  const abierta = subasta.estado === 'Open' && ahoraMs >= inicioMs && ahoraMs <= finMs
  const minimoPermitido = mejorOferta * (1 - Number(subasta.decrementoMinimo || 0) / 100)
  const ofertaNumerica = Number(monto)
  const esPab = Number.isFinite(ofertaNumerica) && subasta.pabThreshold > 0 && ofertaNumerica < subasta.pabThreshold
  const lancesOrdenados = [...subasta.lances].sort((a, b) => b.secuencia - a.secuencia)

  async function enviarLance(event: FormEvent<HTMLFormElement>) {
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

    registrarLance.mutate({
      tenantId: subasta.tenantId,
      auctionId: subasta.id,
      supplierId: data.proveedor.id,
      monto: ofertaNumerica,
    })
  }

  return (
    <PageShell width="wide">
      <PageHeader
        title="Sala en vivo"
        description={(
          <>
            <code>{subasta.codigo}</code> {subasta.titulo}
          </>
        )}
        actions={(
          <Button variant="ghost" type="button" onClick={() => navigate('/proveedor/oportunidades')}>
            Volver
          </Button>
        )}
      />

      {error && <Alert variant="error">{error}</Alert>}
      {mensaje && <Alert variant="info">{mensaje}</Alert>}

      <SubastaLiveMetrics
        conexion={conexion}
        abierta={abierta}
        estado={subasta.estado}
        mejorOferta={mejorOferta}
        minimoPermitido={minimoPermitido}
      />

      <LanceForm
        abierta={abierta}
        ofertando={registrarLance.isPending}
        monto={monto}
        esPab={esPab}
        onMontoChange={setMonto}
        onSubmit={enviarLance}
      />

      <LancesTable lances={lancesOrdenados} />
    </PageShell>
  )
}

function mapLanceRealtime(bid: RealtimeBid): LanceMapped {
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

function normalizarEstado(estado: string | number): string {
  if (estado === 0) return 'Open'
  if (estado === 1) return 'Closed'
  if (estado === 2) return 'Scheduled'
  return String(estado)
}

function formatearFecha(fechaIso?: string | null) {
  if (!fechaIso) return '---'
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(fechaIso))
}
