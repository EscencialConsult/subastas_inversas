// Auditoría: el auditor ve TODOS los procesos del tenant, en cualquier estado.
// Es solo lectura: no tiene acciones que modifiquen nada.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { listarBitacoraAccesos } from '../../api/auditoriaApi.js'
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
  const [accesos, setAccesos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const [emailAcceso, setEmailAcceso] = useState('')
  const [exitoAcceso, setExitoAcceso] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const lista = await listarProcesos({ tenantId, busqueda, estado })
      const bitacora = await listarBitacoraAccesos({
        tenantId,
        email: emailAcceso,
        exito: exitoAcceso,
      })
      setProcesos(lista)
      setAccesos(bitacora)
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
  }, [tenantId, busqueda, estado, emailAcceso, exitoAcceso])

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

      <div className="encabezado auditoria__subheader">
        <h2 className="form__titulo">Bitacora de accesos</h2>
      </div>

      <div className="filtros">
        <input
          className="filtros__busqueda"
          placeholder="Filtrar por email..."
          value={emailAcceso}
          onChange={(e) => setEmailAcceso(e.target.value)}
        />
        <select value={exitoAcceso} onChange={(e) => setExitoAcceso(e.target.value)}>
          <option value="">Todos los resultados</option>
          <option value="ok">Exitosos</option>
          <option value="error">Fallidos</option>
        </select>
      </div>

      {!cargando && accesos.length === 0 ? (
        <div className="estado-vacio">
          <p>No hay accesos que coincidan con el filtro.</p>
        </div>
      ) : (
        !cargando && (
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Email</th>
                <th>Evento</th>
                <th>Resultado</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {accesos.map((a) => (
                <tr key={a.id}>
                  <td>{formatearFecha(a.fecha)}</td>
                  <td>{a.email || '-'}</td>
                  <td>{a.eventoTexto}</td>
                  <td>
                    <span className={a.exito ? 'badge badge--ok' : 'badge badge--error'}>
                      {a.exito ? 'OK' : 'Fallido'}
                    </span>
                    {a.motivo && <small className="campo__ayuda"> {a.motivo}</small>}
                  </td>
                  <td>{a.ip || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
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

function formatearFecha(fecha) {
  if (!fecha) return '-'
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(fecha))
}
