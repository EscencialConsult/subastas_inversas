// Directorio de la red de proveedores (read-only). Lo ven el comprador y la
// supervisión. La invitación a procesos llegará con el módulo de proveedores.

import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { listarProveedores } from '../../api/proveedoresApi.js'

const ESTADO = {
  verificado: { texto: 'Verificado', clase: 'badge--ok' },
  pendiente: { texto: 'Pendiente', clase: 'badge--warn' },
}

export function ProveedoresDirectorioPage() {
  const { rol } = useAuth()
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const lista = await listarProveedores({ busqueda, estado })
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
  }, [busqueda, estado])

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
            </tr>
          </thead>
          <tbody>
            {proveedores.map((p) => {
              const e = ESTADO[p.estado] ?? ESTADO.pendiente
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
