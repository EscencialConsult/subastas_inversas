import { useEffect, useState } from 'react'
import { listarProveedores } from '../../api/proveedoresApi.js'

const ESTADOS = {
  pendiente: { texto: 'Pendiente', clase: 'badge--off' },
  verificado: { texto: 'Verificado', clase: 'badge--ok' },
  rechazado: { texto: 'Rechazado', clase: 'badge--error' },
}

export function ProveedoresListPage() {
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    listarProveedores()
      .then(setProveedores)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [])

  const filtrados = proveedores.filter(
    (p) =>
      !busqueda.trim() ||
      p.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.cuit.includes(busqueda),
  )

  if (cargando) return <p className="estado-cargando">Cargando proveedores…</p>
  if (error) return <div className="alerta alerta--error">{error}</div>

  return (
    <section>
      <div className="encabezado">
        <h1>Proveedores</h1>
      </div>

      <div className="filtros">
        <input
          className="filtros__busqueda"
          placeholder="Buscar por razon social o CUIT…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <span className="badge badge--off" style={{ alignSelf: 'center' }}>
          {filtrados.length} de {proveedores.length}
        </span>
      </div>

      {filtrados.length === 0 ? (
        <div className="estado-vacio">
          <p>No se encontraron proveedores.</p>
        </div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Razon social</th>
              <th>CUIT</th>
              <th>Email</th>
              <th>Provincia</th>
              <th>Localidad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => {
              const estado = ESTADOS[p.estado] ?? ESTADOS.pendiente
              return (
                <tr key={p.id}>
                  <td>{p.razonSocial}</td>
                  <td>{p.cuit}</td>
                  <td>{p.email}</td>
                  <td>{p.provincia}</td>
                  <td>{p.localidad}</td>
                  <td>
                    <span className={`badge ${estado.clase}`}>{estado.texto}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <p className="form__seccion-ayuda" style={{ marginTop: 16 }}>
        Para invitar proveedores a un proceso, abrí el proceso de compra desde la seccion Compras.
      </p>
    </section>
  )
}
