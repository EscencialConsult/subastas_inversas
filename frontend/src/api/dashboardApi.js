// API simulada del panel de inicio (dashboard).
//
// Devuelve un resumen distinto según el rol: tarjetas con números y accesos
// rápidos. Calcula todo desde el mock, siempre filtrando por empresa (tenantId).

import { simularRed } from './client.js'
import { tenants, usuarios, proveedores, procesosCompra, subastas } from './mockDb.js'
import { ROLES, etiquetaRol } from '../domain/roles.js'
import { ESTADO_PROCESO, etiquetaEstado } from '../domain/compras.js'
import { analisisSubasta } from './subastasApi.js'

export function obtenerPanel({ rol, tenantId }) {
  return simularRed(() => {
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
          nota: 'Tu módulo estará disponible próximamente.',
        }
    }
  })
}

function panelSuperAdmin() {
  const activas = tenants.filter((t) => t.activo).length
  return {
    titulo: 'Panel de la plataforma',
    cards: [
      { label: 'Empresas', valor: tenants.length, clase: 'panel-card--info' },
      { label: 'Empresas activas', valor: activas, clase: 'panel-card--ok' },
      { label: 'Usuarios totales', valor: usuarios.length },
      { label: 'Proveedores', valor: proveedores.length },
      { label: 'Procesos de compra', valor: procesosCompra.length, clase: 'panel-card--info' },
      { label: 'Subastas realizadas', valor: subastas.length, clase: 'panel-card--warn' },
    ],
    listas: [
      {
        titulo: 'Usuarios por empresa',
        items: tenants.map((t) => ({
          texto: t.nombre,
          valor: usuarios.filter((u) => u.tenantId === t.id).length,
        })),
      },
    ],
    acciones: [
      { texto: 'Ver empresas', to: '/tenants' },
      { texto: '+ Nueva empresa', to: '/tenants/nuevo' },
    ],
  }
}

function panelAdministrador(tenantId) {
  const propios = usuarios.filter((u) => u.tenantId === tenantId)
  const activos = propios.filter((u) => u.activo).length
  // Distribución por rol (solo los que tienen al menos uno).
  const porRol = {}
  for (const u of propios) porRol[u.rol] = (porRol[u.rol] ?? 0) + 1

  // El administrador supervisa todo lo que pasa en su empresa: también compras.
  const procesos = procesosCompra.filter((p) => p.tenantId === tenantId)
  const cuenta = (estado) => procesos.filter((p) => p.estado === estado).length

  // Ahorro promedio: media del % de baja de las subastas de la empresa que
  // tuvieron ofertas. Mide qué tan competitivas resultaron las subastas.
  const conLances = subastas.filter(
    (s) => s.tenantId === tenantId && s.lances.length > 0,
  )
  const ahorroProm = conLances.length
    ? Math.round(
        conLances.reduce((acc, s) => acc + analisisSubasta(s).bajaPorcentaje, 0) /
          conLances.length,
      )
    : null

  return {
    titulo: 'Panel de administración',
    cards: [
      { label: 'Usuarios', valor: propios.length, clase: 'panel-card--info' },
      { label: 'Activos', valor: activos, clase: 'panel-card--ok' },
      { label: 'Procesos de compra', valor: procesos.length, clase: 'panel-card--info' },
      { label: 'En subasta', valor: cuenta(ESTADO_PROCESO.EN_SUBASTA), clase: 'panel-card--warn' },
      { label: 'Compras aprobadas', valor: cuenta(ESTADO_PROCESO.APROBADA), clase: 'panel-card--ok' },
      {
        label: 'Ahorro promedio',
        valor: ahorroProm === null ? '—' : `${ahorroProm}%`,
        clase: 'panel-card--ok',
      },
    ],
    listas: [
      {
        titulo: 'Usuarios por rol',
        items: Object.entries(porRol).map(([r, n]) => ({
          texto: etiquetaRol(r),
          valor: n,
        })),
      },
      { titulo: 'Procesos por estado', items: estadosConCuenta(procesos) },
    ],
    acciones: [
      { texto: 'Ver usuarios', to: '/usuarios' },
      { texto: '+ Nuevo usuario', to: '/usuarios/nuevo' },
      { texto: 'Subastas realizadas', to: '/subastas' },
      { texto: 'Ver auditoría', to: '/auditoria' },
    ],
  }
}

function panelComprador(tenantId) {
  const propios = procesosCompra.filter((p) => p.tenantId === tenantId)
  const cuenta = (estado) => propios.filter((p) => p.estado === estado).length

  return {
    titulo: 'Panel de compras',
    cards: [
      { label: 'Procesos', valor: propios.length, clase: 'panel-card--info' },
      { label: 'En subasta', valor: cuenta(ESTADO_PROCESO.EN_SUBASTA), clase: 'panel-card--warn' },
      { label: 'Por adjudicar', valor: cuenta(ESTADO_PROCESO.CERRADA), clase: 'panel-card--warn' },
      { label: 'Aprobadas', valor: cuenta(ESTADO_PROCESO.APROBADA), clase: 'panel-card--ok' },
    ],
    listas: [
      {
        titulo: 'Procesos por estado',
        items: estadosConCuenta(propios),
      },
    ],
    acciones: [
      { texto: 'Ver procesos', to: '/compras' },
      { texto: '+ Nuevo proceso', to: '/compras/nuevo' },
      { texto: 'Compras realizadas', to: '/compras-realizadas' },
      { texto: 'Proveedores', to: '/proveedores' },
    ],
  }
}

function panelAutoridad(tenantId) {
  const propios = procesosCompra.filter((p) => p.tenantId === tenantId)
  const pendientes = propios.filter((p) => p.estado === ESTADO_PROCESO.ADJUDICADA).length
  const aprobadas = propios.filter((p) => p.estado === ESTADO_PROCESO.APROBADA)
  const rechazadas = propios.filter((p) => p.aprobacion?.estado === 'rechazada').length
  const montoAprobado = aprobadas.reduce(
    (acc, p) => acc + (p.adjudicacion?.monto ?? 0),
    0,
  )

  return {
    titulo: 'Panel de la Autoridad',
    cards: [
      {
        label: 'Pendientes de aprobar',
        valor: pendientes,
        clase: pendientes > 0 ? 'panel-card--warn' : 'panel-card--ok',
      },
      { label: 'Aprobadas', valor: aprobadas.length, clase: 'panel-card--ok' },
      { label: 'Rechazadas', valor: rechazadas, clase: 'panel-card--off' },
    ],
    listas: [
      {
        titulo: 'Resumen',
        items: [{ texto: 'Monto total aprobado', valor: formatearPesos(montoAprobado) }],
      },
    ],
    acciones: [{ texto: 'Ir a adjudicaciones', to: '/adjudicaciones' }],
  }
}

function panelAuditor(tenantId) {
  const propios = procesosCompra.filter((p) => p.tenantId === tenantId)
  const subastasEmp = subastas.filter((s) => s.tenantId === tenantId)
  return {
    titulo: 'Panel de auditoría',
    cards: [
      { label: 'Procesos totales', valor: propios.length, clase: 'panel-card--info' },
      {
        label: 'En subasta',
        valor: propios.filter((p) => p.estado === ESTADO_PROCESO.EN_SUBASTA).length,
        clase: 'panel-card--warn',
      },
      {
        label: 'Aprobadas',
        valor: propios.filter((p) => p.estado === ESTADO_PROCESO.APROBADA).length,
        clase: 'panel-card--ok',
      },
      { label: 'Subastas realizadas', valor: subastasEmp.length, clase: 'panel-card--info' },
    ],
    listas: [{ titulo: 'Procesos por estado', items: estadosConCuenta(propios) }],
    acciones: [
      { texto: 'Ver auditoría', to: '/auditoria' },
      { texto: 'Subastas realizadas', to: '/subastas' },
    ],
  }
}

function formatearPesos(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}

// Cuenta cuántos procesos hay en cada estado (solo los estados presentes).
function estadosConCuenta(procesos) {
  const cuenta = {}
  for (const p of procesos) cuenta[p.estado] = (cuenta[p.estado] ?? 0) + 1
  return Object.entries(cuenta).map(([estado, n]) => ({
    texto: etiquetaEstado(estado),
    valor: n,
  }))
}
