import { AbstractTransport, TransportState } from './base'
import { ConnectionError } from '../errors'

declare global {
  interface Window {
    ton?: {
      adnl?: {
        send: (data: string) => void
        onMessage: (callback: (data: string) => void) => () => void
      }
    }
  }
}

/**
 * IPC transport for Electron/browser preload environments that expose `window.ton.adnl`.
 */
export class IpcTransport extends AbstractTransport {
  private unsubscribe: (() => void) | null = null
  private _state: TransportState = TransportState.DISCONNECTED

  /** Current transport state. */
  get state(): TransportState {
    return this._state
  }

  /** Connect to the IPC bridge via `window.ton.adnl`. */
  async connect(): Promise<void> {
    if (this._state === TransportState.CONNECTED) return
    if (this._state === TransportState.CONNECTING) {
      throw new ConnectionError('Already connecting', 'ipc')
    }
    if (this._state === TransportState.DESTROYED) {
      throw new ConnectionError('Transport destroyed', 'ipc')
    }

    if (typeof window === 'undefined' || !window.ton?.adnl) {
      throw new ConnectionError('window.ton.adnl not available', 'ipc')
    }

    this.setState(TransportState.CONNECTING)

    this.unsubscribe = window.ton.adnl.onMessage((data: string) => {
      this.emit('message', data)
    })

    this.setState(TransportState.CONNECTED)
    this.emit('open')
  }

  /** Disconnect from the IPC bridge. */
  disconnect(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    if (this._state !== TransportState.DESTROYED) {
      this.setState(TransportState.DISCONNECTED)
    }
    this.emit('close', 1000, 'client disconnect')
  }

  /** Permanently destroy the transport. */
  destroy(): void {
    this.disconnect()
    this.setState(TransportState.DESTROYED)
    this.listeners.clear()
  }

  /** Send data over the IPC bridge. */
  send(data: string): void {
    if (this._state !== TransportState.CONNECTED) {
      throw new ConnectionError('IPC transport not connected', 'ipc')
    }
    if (typeof window === 'undefined' || !window.ton?.adnl) {
      throw new ConnectionError('window.ton.adnl not available', 'ipc')
    }
    window.ton.adnl.send(data)
  }

  private setState(next: TransportState): void {
    const prev = this._state
    if (prev === next) return
    this._state = next
    this.emit('stateChange', next, prev)
  }
}
