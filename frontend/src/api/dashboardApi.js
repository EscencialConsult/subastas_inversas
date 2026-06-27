import { listarProcesos, listarProcesosParaAprobacion, listarProcesosParaAuditoria } from './comprasApi.js'
import { listarProveedores } from './proveedoresApi.js'
import { listarSubastasRealizadas, listarSubastasRealizadasParaAuditoria } from './subastasApi.js'
import { listarTenants } from './tenantsApi.js'
import { listarUsuarios } from './usersApi.js'
import { ESTADO_PROCESO, etiquetaEstado } from '../domain/compras.js'
import { ROLES, etiquetaRol } from '../domain/roles.js'

export async function obtenerPanel({ rol, tenantId }) {
  switch (rol) {
    case ROLES.SUPER_ADMIN:
      return panelSuperAdmin()
    case ROLES.ADMINISTRADOR:
      return panelAdministrador(tenantId)
    case ROLES.COMPRADOR:
      return panelComprador(tenantId)
    case ROLES.AUTORIDAD:
      return panelAutoridad(tenantId)
    case ROLES.AUDITOR:
      return panelAuditor(tenantId)
    default:
      return {
        titulo: 'Panel',
        cards: [],
        acciones: [],
        nota: 'Tu modulo estara disponible proximamente.',
      }
  }
}

async function panelSuperAdmin() {
  const [tenants, proveedores] = await Promise.all([
    listarTenants(),
    listarProveedores().catch(() => []),
  ])

  return {
    titulo: 'Panel de la plataforma',
    cards: [
      { label: 'Empresas', valor: tenants.length, clase: 'panel-card--info' },
      { label: 'Empresas activas', valor: tenants.filter((t) => t.activo).length, clase: 'panel-card--ok' },
      { label: 'Proveedores', valor: proveedores.length },
    ],
    listas: [
      {
        titulo: 'Empresas',
        items: tenants.map((t) => ({ texto: t.nombre, valor: t.activo ? 'Activa' : 'Inactiva' })),
      },
    ],
    acciones: [
      { texto: 'Ver empresas', to: '/tenants' },
      { texto: '+ Nueva empresa', to: '/tenants/nuevo' },
    ],
  }
}

async function panelAdministrador(tenantId) {
  const [usuarios, procesos, subastas] = await Promise.all([
    listarUsuarios({ tenantId }),
    listarProcesos({ tenantId }),
    listarSubastasRealizadas({ tenantId }),
  ])
  const porRol = {}
  for (const u of usuarios) porRol[u.rol] = (porRol[u.rol] ?? 0) + 1

  return {
    titulo: 'Panel de administracion',
    cards: [
      { label: 'Usuarios', valor: usuarios.length, clase: 'panel-card--info' },
      { label: 'Activos', valor: usuarios.filter((u) => u.activo).length, clase: 'panel-card--ok' },
      { label: 'Procesos de compra', valor: procesos.length, clase: 'panel-card--info' },
      { label: 'En subasta', valor: cuenta(procesos, ESTADO_PROCESO.EN_SUBASTA), clase: 'panel-card--warn' },
      { label: 'Compras aprobadas', valor: cuenta(procesos, ESTADO_PROCESO.APROBADA), clase: 'panel-card--ok' },
      { label: 'Subastas realizadas', valor: subastas.length, clase: 'panel-card--info' },
    ],
    listas: [
      {
        titulo: 'Usuarios por rol',
        items: Object.entries(porRol).map(([r, n]) => ({ texto: etiquetaRol(r), valor: n })),
      },
      { titulo: 'Procesos por estado', items: estadosConCuenta(procesos) },
    ],
    acciones: [
      { texto: 'Ver usuarios', to: '/usuarios' },
      { texto: '+ Nuevo usuario', to: '/usuarios/nuevo' },
      { texto: 'Subastas realizadas', to: '/subastas' },
      { texto: 'Ver auditoria', to: '/auditoria' },
    ],
  }
}

async function panelComprador(tenantId) {
  const procesos = await listarProcesos({ tenantId })
  return {
    titulo: 'Panel de compras',
    cards: [
      { label: 'Procesos', valor: procesos.length, clase: 'panel-card--info' },
      { label: 'En subasta', valor: cuenta(procesos, ESTADO_PROCESO.EN_SUBASTA), clase: 'panel-card--warn' },
      { label: 'Por adjudicar', valor: cuenta(procesos, ESTADO_PROCESO.CERRADA), clase: 'panel-card--warn' },
      { label: 'Aprobadas', valor: cuenta(procesos, ESTADO_PROCESO.APROBADA), clase: 'panel-card--ok' },
    ],
    listas: [{ titulo: 'Procesos por estado', items: estadosConCuenta(procesos) }],
    acciones: [
      { texto: 'Ver procesos', to: '/compras' },
      { texto: '+ Nuevo proceso', to: '/compras/nuevo' },
      { texto: 'Compras realizadas', to: '/compras-realizadas' },
      { texto: 'Proveedores', to: '/proveedores' },
    ],
  }
}

async function panelAutoridad(tenantId) {
  const procesos = await listarProcesosParaAprobacion({ tenantId })
  const aprobadas = procesos.filter((p) => p.estado === ESTADO_PROCESO.APROBADA)
  return {
    titulo: 'Panel de la Autoridad',
    cards: [
      {
        label: 'Pendientes de aprobar',
        valor: cuenta(procesos, ESTADO_PROCESO.ADJUDICADA),
        clase: cuenta(procesos, ESTADO_PROCESO.ADJUDICADA) > 0 ? 'panel-card--warn' : 'panel-card--ok',
      },
      { label: 'Aprobadas', valor: aprobadas.length, clase: 'panel-card--ok' },
    ],
    listas: [
      {
        titulo: 'Resumen',
        items: [{ texto: 'Monto total aprobado', valor: formatearPesos(aprobadas.reduce((acc, p) => acc + (p.adjudicacion?.monto ?? 0), 0)) }],
      },
    ],
    acciones: [{ texto: 'Ir a adjudicaciones', to: '/adjudicaciones' }],
  }
}

async function panelAuditor(tenantId) {
  const [procesos, subastas] = await Promise.all([
    listarProcesosParaAuditoria({ tenantId }),
    listarSubastasRealizadasParaAuditoria({ tenantId }),
  ])
  return {
    titulo: 'Panel de auditoria',
    cards: [
      { label: 'Procesos totales', valor: procesos.length, clase: 'panel-card--info' },
      { label: 'En subasta', valor: cuenta(procesos, ESTADO_PROCESO.EN_SUBASTA), clase: 'panel-card--warn' },
      { label: 'Aprobadas', valor: cuenta(procesos, ESTADO_PROCESO.APROBADA), clase: 'panel-card--ok' },
      { label: 'Subastas realizadas', valor: subastas.length, clase: 'panel-card--info' },
    ],
    listas: [{ titulo: 'Procesos por estado', items: estadosConCuenta(procesos) }],
    acciones: [
      { texto: 'Ver auditoria', to: '/auditoria' },
      { texto: 'Subastas realizadas', to: '/subastas' },
    ],
  }
}

function cuenta(procesos, estado) {
  return procesos.filter((p) => p.estado === estado).length
}

function estadosConCuenta(procesos) {
  const total = {}
  for (const p of procesos) total[p.estado] = (total[p.estado] ?? 0) + 1
  return Object.entries(total).map(([estado, n]) => ({ texto: etiquetaEstado(estado), valor: n }))
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
