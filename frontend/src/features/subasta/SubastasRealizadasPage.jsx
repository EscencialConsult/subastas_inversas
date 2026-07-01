// Subastas realizadas: vista de supervisión con el RESULTADO de cada subasta
// (proveedores que ofertaron, baja lograda y proveedor adjudicado).
// Incluye filtros y exportación a CSV. Cada fila lleva al expediente (Auditoría).

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gavel } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { listarSubastasRealizadasParaAuditoria } from '../../api/subastasApi'
import { ESTADO_INFO, etiquetaEstado, claseEstado } from '../../domain/compras'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { Pagination, usePagination } from '../../components/ui/Pagination.jsx'
import { Select } from '../../components/ui/Select.jsx'
import { Spinner } from '../../components/ui/Spinner.jsx'

export function SubastasRealizadasPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [subastas, setSubastas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const subastasPagination = usePagination(subastas, { initialPageSize: 10 })

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const filas = await listarSubastasRealizadasParaAuditoria({ tenantId, busqueda, estado })
      setSubastas(filas)
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

  function exportar() {
    exportarCSV(subastas)
  }

  return (
    <section>
      <div className="encabezado">
        <h1>Subastas realizadas</h1>
        <Button onClick={exportar} disabled={subastas.length === 0}>
          Exportar CSV
        </Button>
      </div>

      <div className="filtros">
        <Input
          className="filtros__busqueda"
          placeholder="Buscar por código, título o proveedor…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_INFO).map(([clave, info]) => (
            <option key={clave} value={clave}>
              {info.label}
            </option>
          ))}
        </Select>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {cargando ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : subastas.length === 0 ? (
        <EmptyState icon={Gavel} title="Sin subastas" description="No hay subastas que coincidan con el filtro." />
      ) : (
        <>
        <table className="tabla">
          <thead>
            <tr>
              <th>Código</th>
              <th>Título</th>
              <th>Oferentes</th>
              <th>Mejor oferta</th>
              <th>Baja</th>
              <th>Adjudicado a</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {subastasPagination.paginatedItems.map((s) => (
              <tr key={s.procesoId}>
                <td>
                  <code>{s.codigo}</code>
                </td>
                <td>{s.titulo}</td>
                <td>{s.oferentes}</td>
                <td>{formatearPesos(s.mejor)}</td>
                <td>
                  <Badge variant={claseBaja(s.nivelBaja)}>
                    {s.bajaPorcentaje.toFixed(1)}%
                  </Badge>
                </td>
                <td>{s.proveedorAdjudicado ?? '—'}</td>
                <td>
                  {s.estadoProceso && (
                    <Badge variant={claseEstado(s.estadoProceso)}>{etiquetaEstado(s.estadoProceso)}</Badge>
                  )}
                </td>
                <td className="tabla__acciones">
                  <Button variant="ghost" onClick={() => navigate(`/auditoria/${s.procesoId}`)}>
                    Ver expediente
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={subastasPagination.page}
          pageSize={subastasPagination.pageSize}
          totalItems={subastasPagination.totalItems}
          totalPages={subastasPagination.totalPages}
          onPageChange={subastasPagination.setPage}
          onPageSizeChange={subastasPagination.setPageSize}
        />
        </>
      )}
    </section>
  )
}

// Genera un CSV y dispara la descarga. Usa ';' (mejor para Excel en español) y
// un BOM para que los acentos se vean bien.
function exportarCSV(filas) {
  const cabecera = [
    'Código',
    'Título',
    'Oferentes',
    'Presupuesto base',
    'Mejor oferta',
    'Baja %',
    'Adjudicado a',
    'Estado',
  ]
  const lineas = filas.map((s) => [
    s.codigo,
    s.titulo,
    s.oferentes,
    s.base,
    s.mejor,
    s.bajaPorcentaje.toFixed(1),
    s.proveedorAdjudicado ?? '',
    etiquetaEstado(s.estadoProceso),
  ])

  const csv = [cabecera, ...lineas]
    .map((fila) => fila.map(celdaCSV).join(';'))
    .join('\r\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'subastas-realizadas.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// Escapa una celda: si tiene ; " o salto de línea, la encierra entre comillas.
function celdaCSV(valor) {
  const texto = String(valor ?? '')
  if (/[";\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`
  }
  return texto
}

function claseBaja(nivel) {
  if (nivel === 'alta') return 'success'
  if (nivel === 'moderada') return 'warning'
  return 'neutral'
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
