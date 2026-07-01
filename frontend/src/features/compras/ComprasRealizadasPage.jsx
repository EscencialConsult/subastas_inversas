// Compras realizadas (legajos): archivo de compras adjudicadas/aprobadas.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { listarComprasRealizadas } from '../../api/comprasApi'
import { etiquetaEstado, claseEstado } from '../../domain/compras'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { Spinner } from '../../components/ui/Spinner.jsx'
import { Table } from '../../components/ui/Table.jsx'

export function ComprasRealizadasPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()

  const [compras, setCompras] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const lista = await listarComprasRealizadas({ tenantId, busqueda })
      setCompras(lista)
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
  }, [tenantId, busqueda])

  return (
    <section>
      <div className="encabezado">
        <h1>Compras realizadas</h1>
      </div>

      <div className="filtros">
        <Input
          className="filtros__busqueda"
          placeholder="Buscar por codigo, titulo o proveedor..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {cargando ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : compras.length === 0 ? (
        <EmptyState icon={Package} title="Sin compras" description="Todavia no hay compras realizadas." />
      ) : (
        <Table
          data={compras}
          pageSize={10}
          columns={[
            { header: 'Codigo', accessor: 'codigo', render: (valor) => <code>{valor}</code> },
            { header: 'Titulo', accessor: 'titulo' },
            { header: 'Proveedor', accessor: 'proveedor' },
            { header: 'Monto', accessor: 'monto', render: (valor) => formatearPesos(valor) },
            { header: 'Fecha', accessor: 'fecha' },
            {
              header: 'Estado',
              accessor: 'estado',
              render: (valor) => <Badge variant={claseEstado(valor)}>{etiquetaEstado(valor)}</Badge>,
            },
            {
              header: '',
              accessor: 'acciones',
              sortKey: false,
              render: (_, compra) => (
                <Button variant="ghost" onClick={() => navigate(`/compras/${compra.id}`)}>
                  Ver legajo
                </Button>
              ),
            },
          ]}
        />
      )}
    </section>
  )
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
