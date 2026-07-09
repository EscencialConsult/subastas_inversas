import { Badge } from '../../../shared/ui/Badge'
import { DataTable, type DataTableColumn } from '../../../shared/ui/DataTable'
import { FormSection } from '../../../shared/ui/FormSection'
import type { AlertaRiesgo } from './auditoriaDetailTypes'

function etiquetaSeveridad(severidad?: string) {
  const mapa: Record<string, string> = { high: 'Alta', medium: 'Media', info: 'Info' }
  return mapa[severidad ?? ''] ?? severidad ?? '---'
}

function claseSeveridad(severidad?: string): 'error' | 'warning' | 'info' | 'neutral' {
  const mapa: Record<string, 'error' | 'warning' | 'info'> = { high: 'error', medium: 'warning', info: 'info' }
  return mapa[severidad ?? ''] ?? 'neutral'
}

function etiquetaAlerta(codigo?: string) {
  const mapa: Record<string, string> = {
    single_offerer: 'Un solo oferente',
    bid_concentration: 'Concentración',
    minimal_difference: 'Diferencia mínima',
    pab: 'PAB',
    no_bids: 'Sin lances',
  }
  return mapa[codigo ?? ''] ?? codigo ?? '---'
}

export function AlertasSection({ alertas }: { alertas: AlertaRiesgo[] }) {
  if (alertas.length === 0) return null

  const columns: Array<DataTableColumn<AlertaRiesgo & Record<string, unknown>>> = [
    {
      header: 'Severidad',
      cell: (row) => <Badge variant={claseSeveridad(row.severidad)}>{etiquetaSeveridad(row.severidad)}</Badge>,
    },
    {
      header: 'Tipo',
      cell: (row) => etiquetaAlerta(row.codigo),
    },
    { header: 'Detalle', accessor: 'mensaje' },
    {
      header: 'Métrica',
      cell: (row) => {
        if (row.valor === null || row.valor === undefined) return '---'
        return `${row.valor}${row.unidad ? ` ${row.unidad}` : ''}`
      },
    },
  ]

  return (
    <FormSection title="Alertas automáticas de riesgo">
      <DataTable
        columns={columns}
        rows={alertas as (AlertaRiesgo & Record<string, unknown>)[]}
        getRowId={(row) => `${row.codigo}:${row.detectadaEn}`}
      />
    </FormSection>
  )
}
