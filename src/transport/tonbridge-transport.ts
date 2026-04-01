import { AbstractTransport, TransportState } from './base'
import { ConnectionError } from '../errors'

declare global {
  interface Window {
    tonBridge?: {
      send: (data: string) => void
      onMessage: (callback: (data: string) => void) => () => void
    }
  }
}

/**
 * Transport for Tonnet Browser environments that expose `window.tonBridge`.
 */
export class TonBridgeTransport extends AbstractTransport {
  private unsubscribe: (() => void) | null = null
  private _state: TransportState = TransportState.DISCONNECTED

  /** Current transport state. */
  get state(): TransportState {
    return this._state
  }

  /** Connect to the browser bridge via `window.tonBridge`. */
  async connect(): Promise<void> {
    if (this._state === TransportState.CONNECTED) return
    if (this._state === TransportState.CONNECTING) {
      throw new ConnectionError('Already connecting', 'tonbridge')
    }
    if (this._state === TransportState.DESTROYED) {
      throw new ConnectionError('Transport destroyed', 'tonbridge')
    }

    if (typeof window === 'undefined' || !window.tonBridge) {
      throw new ConnectionError('window.tonBridge not available', 'tonbridge')
    }

    this.setState(TransportState.CONNECTING)

    this.unsubscribe = window.tonBridge.onMessage((data: string) => {
      this.emit('message', data)
    })

    this.setState(TransportState.CONNECTED)
    this.emit('open')
  }

  /** Disconnect from the browser bridge. */
  disconnect(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    if (this._state === TransportState.CONNECTED || this._state === TransportState.CONNECTING) {
      this.setState(TransportState.DISCONNECTED)
      this.emit('close', 1000, 'client disconnect')
    }
  }

  /** Permanently destroy the transport. */
  destroy(): void {
    this.disconnect()
    this.setState(TransportState.DESTROYED)
    this.listeners.clear()
  }

  /** Send data over the browser bridge. */
  send(data: string): void {
    if (this._state !== TransportState.CONNECTED) {
      throw new ConnectionError('TonBridge transport not connected', 'tonbridge')
    }
    if (typeof window === 'undefined' || !window.tonBridge) {
      throw new ConnectionError('window.tonBridge not available', 'tonbridge')
    }
    window.tonBridge.send(data)
  }

  private setState(next: TransportState): void {
    const prev = this._state
    if (prev === next) return
    this._state = next
    this.emit('stateChange', next, prev)
  }
}
