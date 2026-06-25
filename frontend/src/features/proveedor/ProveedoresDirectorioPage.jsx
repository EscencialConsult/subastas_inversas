// Directorio de la red de proveedores (read-only). Lo ven el comprador y la
// supervisión. La invitación a procesos llegará con el módulo de proveedores.

import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { habilitarProveedorEmpresa, listarProveedores } from '../../api/proveedoresApi.js'

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
  const [error, setError] = useState('')

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
      const lista = await listarProveedores({
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
  }, [busqueda, estado, rubro, provincia, localidad, cercania, tenantId])

  async function habilitar(proveedorId) {
    if (!tenantId) return

    setProcesandoId(proveedorId)
    setError('')
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
    } catch (err) {
      setError(err.message)
    } finally {
      setProcesandoId(null)
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
                      <button
                        className="btn btn--texto"
                        type="button"
                        onClick={() => habilitar(p.id)}
                        disabled={procesandoId === p.id}
                      >
                        {procesandoId === p.id ? 'Evaluando...' : 'Habilitar'}
                      </button>
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
          Próximamente vas a poder invitar proveedores a tus procesos desde acá.
        </p>
      )}
    </section>
  )
}
