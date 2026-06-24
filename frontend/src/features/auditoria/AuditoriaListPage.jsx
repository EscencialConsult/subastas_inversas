// Auditoría: el auditor ve TODOS los procesos del tenant, en cualquier estado.
// Es solo lectura: no tiene acciones que modifiquen nada.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { listarProcesos } from '../../api/comprasApi.js'
import {
  ESTADO_INFO,
  etiquetaEstado,
  claseEstado,
} from '../../domain/compras.js'

export function AuditoriaListPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [procesos, setProcesos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const lista = await listarProcesos({ tenantId, busqueda, estado })
      setProcesos(lista)
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
  }, [tenantId, busqueda, estado])

  return (
    <section>
      <div className="encabezado">
        <h1>Auditoría</h1>
        <button
          className="btn btn--primario"
          onClick={() => exportarCSV(procesos)}
          disabled={procesos.length === 0}
        >
          Exportar CSV
        </button>
      </div>

      <div className="filtros">
        <input
          className="filtros__busqueda"
          placeholder="Buscar por código o título…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_INFO).map(([clave, info]) => (
            <option key={clave} value={clave}>
              {info.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="alerta alerta--error">{error}</div>}

      {cargando ? (
        <p className="estado-cargando">Cargando…</p>
      ) : procesos.length === 0 ? (
        <div className="estado-vacio">
          <p>No hay procesos que coincidan con el filtro.</p>
        </div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Código</th>
              <th>Título</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {procesos.map((p) => (
              <tr key={p.id}>
                <td>
                  <code>{p.codigo}</code>
                </td>
                <td>{p.titulo}</td>
                <td>
                  <span className={`badge ${claseEstado(p.estado)}`}>
                    {etiquetaEstado(p.estado)}
                  </span>
                </td>
                <td className="tabla__acciones">
                  <button
                    className="btn btn--texto"
                    onClick={() => navigate(`/auditoria/${p.id}`)}
                  >
                    Ver expediente
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

// Exporta los procesos visibles a CSV (';' + BOM para Excel en español).
function exportarCSV(procesos) {
  const cabecera = ['Código', 'Título', 'Estado', 'Adjudicado a', 'Monto', 'Creado']
  const filas = procesos.map((p) => [
    p.codigo,
    p.titulo,
    etiquetaEstado(p.estado),
    p.adjudicacion?.proveedor ?? '',
    p.adjudicacion?.monto ?? '',
    p.creadoEn,
  ])
  const csv = [cabecera, ...filas]
    .map((fila) => fila.map(celdaCSV).join(';'))
    .join('\r\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'auditoria-procesos.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function celdaCSV(valor) {
  const texto = String(valor ?? '')
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}
