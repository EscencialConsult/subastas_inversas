import * as signalR from '@microsoft/signalr'
import { API_URL } from './client.js'

const CLAVE_STORAGE = 'sicst.sesion'

export function crearConexionSubastas() {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${API_URL}/hubs/auctions`, {
      accessTokenFactory: obtenerToken,
    })
    .withAutomaticReconnect()
    .build()
}

function obtenerToken() {
  try {
    const sesionCruda = localStorage.getItem(CLAVE_STORAGE)
    if (!sesionCruda) return ''
    const sesion = JSON.parse(sesionCruda)
    return sesion?.token ?? ''
  } catch {
    return ''
  }
}
