export { AbstractTransport, TransportState } from './base'
export type { TransportEvents, TransportEventName } from './base'
export { WsTransport } from './ws-transport'
export type { WsTransportOptions } from './ws-transport'
export { IpcTransport } from './ipc-transport'

import { AbstractTransport } from './base'
import { WsTransport, WsTransportOptions } from './ws-transport'
import { IpcTransport } from './ipc-transport'

/** Auto-detect the best transport: prefer IPC in Electron preload, otherwise WebSocket. */
export function createTransport(options?: WsTransportOptions): AbstractTransport {
  if (typeof window !== 'undefined' && window.ton?.adnl) {
    return new IpcTransport()
  }
  return new WsTransport(options)
}
