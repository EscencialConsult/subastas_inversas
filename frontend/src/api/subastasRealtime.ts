import * as signalR from '@microsoft/signalr'
import { API_URL, getAccessToken } from './client'

export function crearConexionSubastas() {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${API_URL}/hubs/auctions`, {
      accessTokenFactory: () => getAccessToken() ?? '',
    })
    .withAutomaticReconnect()
    .build()
}
