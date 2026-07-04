import { obtenerPanel } from '../../../shared/api/dashboardApi'

export interface DashboardPanel {
  titulo: string
  nota?: string
  cards?: any[]
  kpis?: any[]
  graficos?: any[]
  listas?: any[]
  feed?: any[]
  acciones?: any[]
}

export const dashboardKeys = {
  all: ['dashboard'] as const,
  panel: (rol?: string | null, tenantId?: string | null) => [...dashboardKeys.all, 'panel', rol ?? '', tenantId ?? ''] as const,
}

export function obtenerPanelQuery(params: { rol?: string | null; tenantId?: string | null }): Promise<DashboardPanel> {
  return obtenerPanel({ rol: params.rol, tenantId: params.tenantId }) as Promise<DashboardPanel>
}
