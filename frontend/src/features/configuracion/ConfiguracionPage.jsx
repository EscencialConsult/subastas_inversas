import { useEffect, useState } from 'react'
import { Settings, FileText, GitBranch, Save, Plus } from 'lucide-react'
import { useAuth } from '../../auth/useAuth.js'
import {
  obtenerConfiguracionEmpresa,
  guardarConfiguracionEmpresa,
  listarModalidades,
  crearModalidad,
  listarCircuitos,
  crearCircuito,
} from '../../api/configuracionApi.js'
import { formatearPesos } from '../../utils/formatear.js'

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

  if (cargando) return <p className="estado-cargando">Cargando configuración…</p>

  return (
    <section>
      <div className="encabezado">
        <h1>Configuración</h1>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      {/* Configuración de empresa */}
      <form className="perfil__seccion" onSubmit={guardarConfig} style={{ marginBottom: 20 }}>
        <div className="perfil__seccion-header">
          <div className="perfil__seccion-icon">
            <Settings size={18} />
          </div>
          <div>
            <h2>Configuración de empresa</h2>
            <p>Parámetros generales de la organización</p>
          </div>
        </div>
        <div className="perfil__cuerpo">
          <label className="campo">
            <span>Moneda</span>
            <input value={config.defaultCurrency} onChange={(e) => actualizarConfig('defaultCurrency', e.target.value)} />
          </label>
          <label className="campo">
            <span>Zona horaria</span>
            <input value={config.timeZone} onChange={(e) => actualizarConfig('timeZone', e.target.value)} />
          </label>
          <label className="campo">
            <span>Decremento mínimo de oferta (%)</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={config.minimumBidDecrementPercentage}
              onChange={(e) => actualizarConfig('minimumBidDecrementPercentage', e.target.value)}
            />
          </label>
          <label className="campo">
            <span>Extensión de subasta (minutos)</span>
            <input
              type="number"
              min="0"
              value={config.auctionExtensionMinutes}
              onChange={(e) => actualizarConfig('auctionExtensionMinutes', e.target.value)}
            />
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={config.requireSupplierVerification}
              onChange={(e) => actualizarConfig('requireSupplierVerification', e.target.checked)}
            />
            <span className="toggle__control" />
            <span className="toggle__label">Requerir proveedor verificado</span>
          </label>
          <div className="form__acciones">
            <button className="btn btn--primario" disabled={guardando}>
              <Save size={16} />
              {guardando ? 'Guardando…' : 'Guardar configuración'}
            </button>
          </div>
        </div>
      </form>

      {/* Modalidades de contratación */}
      <section className="perfil__seccion" style={{ marginBottom: 20 }}>
        <div className="perfil__seccion-header">
          <div className="perfil__seccion-icon">
            <FileText size={18} />
          </div>
          <div>
            <h2>Modalidades de contratación</h2>
            <p>Tipos de contratación disponibles para los procesos de compra</p>
          </div>
        </div>
        <div className="perfil__cuerpo">
          {modalidades.length === 0 ? (
            <p className="form__seccion-ayuda" style={{ marginBottom: 16 }}>No hay modalidades cargadas.</p>
          ) : (
            <table className="tabla" style={{ marginBottom: 16 }}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Subasta</th>
                </tr>
              </thead>
              <tbody>
                {modalidades.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td className="text-slate-500">{m.description || '—'}</td>
                    <td>
                      <span className={`badge ${m.requiresAuction ? 'badge--ok' : 'badge--off'}`}>
                        {m.requiresAuction ? 'Con subasta' : 'Sin subasta'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <hr className="form__seccion-ayuda" style={{ border: 'none', borderTop: '1px solid var(--color-borde)', margin: '12px 0' }} />

          <p className="form__seccion-ayuda" style={{ marginBottom: 12, fontWeight: 600, color: 'var(--color-texto)' }}>
            Agregar nueva modalidad
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label className="campo" style={{ marginBottom: 0 }}>
              <span>Nombre</span>
              <input value={modalidad.name} onChange={(e) => setModalidad((p) => ({ ...p, name: e.target.value }))} />
            </label>
            <label className="campo" style={{ marginBottom: 0 }}>
              <span>Descripción</span>
              <input value={modalidad.description} onChange={(e) => setModalidad((p) => ({ ...p, description: e.target.value }))} />
            </label>
            <label className="toggle" style={{ marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={modalidad.requiresAuction}
                onChange={(e) => setModalidad((p) => ({ ...p, requiresAuction: e.target.checked }))}
              />
              <span className="toggle__control" />
              <span className="toggle__label">Requiere subasta</span>
            </label>
            <div>
              <button className="btn btn--primario" onClick={agregarModalidad} type="button">
                <Plus size={16} />
                Agregar modalidad
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Circuitos de aprobación */}
      <section className="perfil__seccion" style={{ marginBottom: 20 }}>
        <div className="perfil__seccion-header">
          <div className="perfil__seccion-icon">
            <GitBranch size={18} />
          </div>
          <div>
            <h2>Circuitos de aprobación</h2>
            <p>Reglas de aprobación según montos del proceso</p>
          </div>
        </div>
        <div className="perfil__cuerpo">
          {circuitos.length === 0 ? (
            <p className="form__seccion-ayuda" style={{ marginBottom: 16 }}>No hay circuitos cargados.</p>
          ) : (
            <table className="tabla" style={{ marginBottom: 16 }}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Monto mínimo</th>
                  <th>Monto máximo</th>
                  <th>Aprobaciones</th>
                </tr>
              </thead>
              <tbody>
                {circuitos.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td className="text-slate-500">{c.minAmount != null ? formatearPesos(c.minAmount) : '—'}</td>
                    <td className="text-slate-500">{c.maxAmount != null ? formatearPesos(c.maxAmount) : '—'}</td>
                    <td><span className="badge badge--info">{c.requiredApprovals}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <hr className="form__seccion-ayuda" style={{ border: 'none', borderTop: '1px solid var(--color-borde)', margin: '12px 0' }} />

          <p className="form__seccion-ayuda" style={{ marginBottom: 12, fontWeight: 600, color: 'var(--color-texto)' }}>
            Agregar nuevo circuito
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label className="campo" style={{ marginBottom: 0 }}>
              <span>Nombre</span>
              <input value={circuito.name} onChange={(e) => setCircuito((p) => ({ ...p, name: e.target.value }))} />
            </label>
            <div className="filtros" style={{ marginBottom: 0 }}>
              <label className="campo" style={{ marginBottom: 0, flex: 1 }}>
                <span>Monto mínimo</span>
                <input placeholder="0" type="number" value={circuito.minAmount} onChange={(e) => setCircuito((p) => ({ ...p, minAmount: e.target.value }))} />
              </label>
              <label className="campo" style={{ marginBottom: 0, flex: 1 }}>
                <span>Monto máximo</span>
                <input placeholder="999999" type="number" value={circuito.maxAmount} onChange={(e) => setCircuito((p) => ({ ...p, maxAmount: e.target.value }))} />
              </label>
              <label className="campo" style={{ marginBottom: 0, flex: 1 }}>
                <span>Aprobaciones requeridas</span>
                <input placeholder="1" type="number" min="1" value={circuito.requiredApprovals} onChange={(e) => setCircuito((p) => ({ ...p, requiredApprovals: e.target.value }))} />
              </label>
            </div>
            <div>
              <button className="btn btn--primario" onClick={agregarCircuito} type="button">
                <Plus size={16} />
                Agregar circuito
              </button>
            </div>
          </div>
        </div>
      </section>
    </section>
  )
}

