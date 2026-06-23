import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth.js'
import {
  obtenerConfiguracionEmpresa,
  guardarConfiguracionEmpresa,
  listarModalidades,
  crearModalidad,
  listarCircuitos,
  crearCircuito,
} from '../../api/configuracionApi.js'

const CONFIG_INICIAL = {
  defaultCurrency: 'ARS',
  timeZone: 'America/Argentina/Buenos_Aires',
  minimumBidDecrementPercentage: 1,
  auctionExtensionMinutes: 2,
  requireSupplierVerification: true,
}

const MODALIDAD_INICIAL = { name: '', description: '', requiresAuction: true }
const CIRCUITO_INICIAL = {
  name: '',
  minAmount: '',
  maxAmount: '',
  requiredRole: 6,
  requiredApprovals: 1,
}

export function ConfiguracionPage() {
  const { tenantId } = useAuth()
  const [config, setConfig] = useState(CONFIG_INICIAL)
  const [modalidades, setModalidades] = useState([])
  const [circuitos, setCircuitos] = useState([])
  const [modalidad, setModalidad] = useState(MODALIDAD_INICIAL)
  const [circuito, setCircuito] = useState(CIRCUITO_INICIAL)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function cargar() {
    setError('')
    try {
      const [cfg, modes, workflows] = await Promise.all([
        obtenerConfiguracionEmpresa({ tenantId }),
        listarModalidades({ tenantId }),
        listarCircuitos({ tenantId }),
      ])
      setConfig(cfg)
      setModalidades(modes)
      setCircuitos(workflows)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(cargar, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  function actualizarConfig(campo, valor) {
    setConfig((prev) => ({ ...prev, [campo]: valor }))
  }

  async function guardarConfig(e) {
    e.preventDefault()
    setGuardando(true)
    setError('')
    try {
      const actualizada = await guardarConfiguracionEmpresa({ tenantId, datos: config })
      setConfig(actualizada)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function agregarModalidad(e) {
    e.preventDefault()
    setError('')
    try {
      await crearModalidad({ tenantId, datos: modalidad })
      setModalidad(MODALIDAD_INICIAL)
      setModalidades(await listarModalidades({ tenantId }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function agregarCircuito(e) {
    e.preventDefault()
    setError('')
    try {
      await crearCircuito({ tenantId, datos: circuito })
      setCircuito(CIRCUITO_INICIAL)
      setCircuitos(await listarCircuitos({ tenantId }))
    } catch (err) {
      setError(err.message)
    }
  }

  if (cargando) return <p className="estado-cargando">Cargando configuracion...</p>

  return (
    <section>
      <div className="encabezado">
        <h1>Configuracion</h1>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      <form className="form" onSubmit={guardarConfig}>
        <h2 className="form__titulo">Configuracion de empresa</h2>
        <label className="campo">
          <span>Moneda</span>
          <input value={config.defaultCurrency} onChange={(e) => actualizarConfig('defaultCurrency', e.target.value)} />
        </label>
        <label className="campo">
          <span>Zona horaria</span>
          <input value={config.timeZone} onChange={(e) => actualizarConfig('timeZone', e.target.value)} />
        </label>
        <label className="campo">
          <span>Decremento minimo de oferta (%)</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={config.minimumBidDecrementPercentage}
            onChange={(e) => actualizarConfig('minimumBidDecrementPercentage', e.target.value)}
          />
        </label>
        <label className="campo">
          <span>Extension de subasta (minutos)</span>
          <input
            type="number"
            min="0"
            value={config.auctionExtensionMinutes}
            onChange={(e) => actualizarConfig('auctionExtensionMinutes', e.target.value)}
          />
        </label>
        <label className="campo campo--checkbox">
          <input
            type="checkbox"
            checked={config.requireSupplierVerification}
            onChange={(e) => actualizarConfig('requireSupplierVerification', e.target.checked)}
          />
          <span>Requerir proveedor verificado</span>
        </label>
        <div className="form__acciones">
          <button className="btn btn--primario" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar configuracion'}
          </button>
        </div>
      </form>

      <form className="form" onSubmit={agregarModalidad}>
        <h2 className="form__titulo">Modalidades de contratacion</h2>
        <div className="perfil__solo-lectura">
          {modalidades.length === 0 ? <span>No hay modalidades.</span> : modalidades.map((m) => (
            <span key={m.id}>{m.name} - {m.requiresAuction ? 'Con subasta' : 'Sin subasta'}</span>
          ))}
        </div>
        <label className="campo">
          <span>Nombre</span>
          <input value={modalidad.name} onChange={(e) => setModalidad((p) => ({ ...p, name: e.target.value }))} />
        </label>
        <label className="campo">
          <span>Descripcion</span>
          <input value={modalidad.description} onChange={(e) => setModalidad((p) => ({ ...p, description: e.target.value }))} />
        </label>
        <label className="campo campo--checkbox">
          <input
            type="checkbox"
            checked={modalidad.requiresAuction}
            onChange={(e) => setModalidad((p) => ({ ...p, requiresAuction: e.target.checked }))}
          />
          <span>Requiere subasta</span>
        </label>
        <button className="btn btn--primario">Agregar modalidad</button>
      </form>

      <form className="form" onSubmit={agregarCircuito}>
        <h2 className="form__titulo">Circuitos de aprobacion</h2>
        <div className="perfil__solo-lectura">
          {circuitos.length === 0 ? <span>No hay circuitos.</span> : circuitos.map((c) => (
            <span key={c.id}>{c.name} - aprobaciones: {c.requiredApprovals}</span>
          ))}
        </div>
        <label className="campo">
          <span>Nombre</span>
          <input value={circuito.name} onChange={(e) => setCircuito((p) => ({ ...p, name: e.target.value }))} />
        </label>
        <div className="filtros">
          <input placeholder="Monto minimo" type="number" value={circuito.minAmount} onChange={(e) => setCircuito((p) => ({ ...p, minAmount: e.target.value }))} />
          <input placeholder="Monto maximo" type="number" value={circuito.maxAmount} onChange={(e) => setCircuito((p) => ({ ...p, maxAmount: e.target.value }))} />
          <input placeholder="Aprobaciones" type="number" min="1" value={circuito.requiredApprovals} onChange={(e) => setCircuito((p) => ({ ...p, requiredApprovals: e.target.value }))} />
        </div>
        <button className="btn btn--primario">Agregar circuito</button>
      </form>
    </section>
  )
}
