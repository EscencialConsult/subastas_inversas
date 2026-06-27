// Directorio de la red de proveedores (read-only). Lo ven el comprador y la
// supervisión. La invitación a procesos llegará con el módulo de proveedores.

import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import {
  habilitarProveedorEmpresa,
  listarProveedores,
  listarProveedoresParaAuditoria,
} from '../../api/proveedoresApi.js'
import { invitarProveedorAProceso, listarProcesos } from '../../api/comprasApi.js'
import { ESTADO_PROCESO } from '../../domain/compras.js'

const ESTADO = {
  verificado: { texto: 'Verificado', clase: 'badge--ok' },
  pendiente: { texto: 'Pendiente', clase: 'badge--warn' },
}

const ESTADO_EMPRESA = {
  sin_habilitar: { texto: 'Sin habilitar', clase: 'badge--off' },
  habilitado: { texto: 'Habilitado', clase: 'badge--ok' },
  habilitado_con_alerta: { texto: 'Habilitado con alerta', clase: 'badge--warn' },
  bloqueado: { texto: 'Bloqueado', clase: 'badge--error' },
}

export function ProveedoresDirectorioPage() {
  const { rol, tenantId } = useAuth()
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [procesandoId, setProcesandoId] = useState(null)
  const [invitandoId, setInvitandoId] = useState(null)
  const [procesosInvitables, setProcesosInvitables] = useState([])
  const [procesoSeleccionadoId, setProcesoSeleccionadoId] = useState('')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const [rubro, setRubro] = useState('')
  const [provincia, setProvincia] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [cercania, setCercania] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const listar = rol === 'auditor' ? listarProveedoresParaAuditoria : listarProveedores
      const lista = await listar({
        busqueda,
        estado,
        rubro,
        provincia,
        localidad,
        cercania,
        tenantId,
      })
      setProveedores(lista)
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
  }, [busqueda, estado, rubro, provincia, localidad, cercania, tenantId, rol])

  useEffect(() => {
    if (!tenantId || rol !== 'comprador') return

    listarProcesos({ tenantId })
      .then((procesos) => {
        const invitables = procesos.filter((proceso) => proceso.estado === ESTADO_PROCESO.PUBLICADO)
        setProcesosInvitables(invitables)
        setProcesoSeleccionadoId((actual) => actual || invitables[0]?.id || '')
      })
      .catch((err) => setError(err.message))
  }, [tenantId, rol])

  async function habilitar(proveedorId) {
    if (!tenantId) return

    setProcesandoId(proveedorId)
    setError('')
    setMensaje('')
    try {
      const resultado = await habilitarProveedorEmpresa({ tenantId, proveedorId })
      setProveedores((actual) =>
        actual.map((proveedor) =>
          proveedor.id === proveedorId
            ? {
                ...proveedor,
                estadoEmpresa: resultado.estadoEmpresa,
                advertenciaEmpresa: resultado.advertenciaEmpresa,
                politicaEstricta: resultado.politicaEstricta,
              }
            : proveedor,
        ),
      )
      setMensaje('Proveedor evaluado para tu empresa.')
    } catch (err) {
      setError(err.message)
    } finally {
      setProcesandoId(null)
    }
  }

  async function invitar(proveedorId) {
    if (!tenantId || !procesoSeleccionadoId) return

    setInvitandoId(proveedorId)
    setError('')
    setMensaje('')
    try {
      await invitarProveedorAProceso({
        tenantId,
        procesoId: procesoSeleccionadoId,
        proveedorId,
      })
      setMensaje('Invitacion enviada al proveedor.')
    } catch (err) {
      setError(err.message)
    } finally {
      setInvitandoId(null)
    }
  }

  return (
    <section>
      <div className="encabezado">
        <h1>Proveedores</h1>
      </div>

      <div className="alerta alerta--info">
        Red de proveedores compartida: un proveedor se registra una vez y queda
        disponible para todas las empresas.
      </div>

      <div className="filtros">
        <input
          className="filtros__busqueda"
          placeholder="Buscar por razón social, CUIT, rubro o provincia…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="verificado">Verificado</option>
          <option value="pendiente">Pendiente</option>
        </select>
        <input
          placeholder="Rubro"
          value={rubro}
          onChange={(e) => setRubro(e.target.value)}
        />
        <input
          placeholder="Provincia"
          value={provincia}
          onChange={(e) => setProvincia(e.target.value)}
        />
        <input
          placeholder="Localidad"
          value={localidad}
          onChange={(e) => setLocalidad(e.target.value)}
        />
        <select value={cercania} onChange={(e) => setCercania(e.target.value)}>
          <option value="">Cercania</option>
          <option value="sameProvince">Misma provincia</option>
          <option value="sameLocality">Misma localidad</option>
        </select>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}
      {mensaje && <div className="alerta alerta--ok">{mensaje}</div>}

      {rol === 'comprador' && (
        <div className="form" style={{ marginBottom: 16 }}>
          <h2 className="form__titulo">Invitar a proceso</h2>
          {procesosInvitables.length === 0 ? (
            <p className="form__seccion-ayuda">
              Publica un proceso de compra antes de invitar proveedores.
            </p>
          ) : (
            <label className="campo">
              <span>Proceso publicado</span>
              <select
                value={procesoSeleccionadoId}
                onChange={(e) => setProcesoSeleccionadoId(e.target.value)}
              >
                {procesosInvitables.map((proceso) => (
                  <option key={proceso.id} value={proceso.id}>
                    {proceso.codigo} - {proceso.titulo}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {cargando ? (
        <p className="estado-cargando">Cargando proveedores…</p>
      ) : proveedores.length === 0 ? (
        <div className="estado-vacio">
          <p>No hay proveedores que coincidan con el filtro.</p>
        </div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Razón social</th>
              <th>CUIT</th>
              <th>Rubro</th>
              <th>Provincia</th>
              <th>Estado</th>
              <th>Habilitacion</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {proveedores.map((p) => {
              const e = ESTADO[p.estado] ?? ESTADO.pendiente
              const estadoEmpresa = ESTADO_EMPRESA[p.estadoEmpresa] ?? ESTADO_EMPRESA.sin_habilitar
              const puedeGestionarHabilitacion = rol === 'comprador' || rol === 'administrador'
              const requiereHabilitacion =
                p.estadoEmpresa === 'sin_habilitar' || p.estadoEmpresa === 'bloqueado'
              return (
                <tr key={p.id}>
                  <td>{p.razonSocial}</td>
                  <td>
                    <code>{p.cuit}</code>
                  </td>
                  <td>{p.rubro}</td>
                  <td>{p.provincia}</td>
                  <td>
                    <span className={`badge ${e.clase}`}>{e.texto}</span>
                  </td>
                  <td>
                    <span className={`badge ${estadoEmpresa.clase}`}>{estadoEmpresa.texto}</span>
                    {p.advertenciaEmpresa && <small className="tabla__nota">{p.advertenciaEmpresa}</small>}
                  </td>
                  <td>
                    {tenantId && (
                      <div className="tabla__acciones">
                        {puedeGestionarHabilitacion && requiereHabilitacion && (
                          <button
                            className="btn btn--texto"
                            type="button"
                            onClick={() => habilitar(p.id)}
                            disabled={procesandoId === p.id}
                          >
                            {procesandoId === p.id ? 'Evaluando...' : 'Habilitar'}
                          </button>
                        )}
                        {rol === 'comprador' && (
                          <button
                            className="btn btn--texto"
                            type="button"
                            onClick={() => invitar(p.id)}
                            disabled={
                              invitandoId === p.id ||
                              !procesoSeleccionadoId ||
                              p.estadoEmpresa === 'sin_habilitar' ||
                              p.estadoEmpresa === 'bloqueado'
                            }
                          >
                            {invitandoId === p.id ? 'Invitando...' : 'Invitar'}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {rol === 'comprador' && (
        <p className="campo__ayuda" style={{ marginTop: 12 }}>
          Para invitar, el proveedor debe estar habilitado o habilitado con alerta para tu empresa.
        </p>
      )}
    </section>
  )
}
