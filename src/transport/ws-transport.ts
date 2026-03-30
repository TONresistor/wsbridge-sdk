import { AbstractTransport, TransportState } from './base'
import { ConnectionError } from '../errors'

export interface WsTransportOptions {
  url?: string
  autoReconnect?: boolean
  reconnectDelay?: number
  reconnectMaxDelay?: number
  reconnectMaxRetries?: number
  /** Keepalive ping interval in ms. 0 disables. Default: 30 000. Only works in Node.js. */
  keepaliveInterval?: number
}

/**
 * WebSocket-based transport with auto-reconnect, keepalive, and state tracking.
 */
export class WsTransport extends AbstractTransport {
  private ws: WebSocket | null = null
  private readonly url: string
  private readonly autoReconnect: boolean
  private readonly reconnectDelay: number
  private readonly reconnectMaxDelay: number
  private readonly reconnectMaxRetries: number
  private readonly keepaliveInterval: number
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null
  private intentionalClose = false
  private _state: TransportState = TransportState.DISCONNECTED

  constructor(options: WsTransportOptions = {}) {
    super()
    this.url = options.url ?? 'ws://127.0.0.1:8081'
    this.autoReconnect = options.autoReconnect ?? true
    this.reconnectDelay = options.reconnectDelay ?? 1000
    this.reconnectMaxDelay = options.reconnectMaxDelay ?? 30000
    this.reconnectMaxRetries = options.reconnectMaxRetries ?? Infinity
    this.keepaliveInterval = options.keepaliveInterval ?? 30_000
  }

  /** Current transport state. */
  get state(): TransportState {
    return this._state
  }

  /** Open a WebSocket connection. Throws if already connecting or destroyed. */
  async connect(): Promise<void> {
    if (this._state === TransportState.CONNECTED) return
    if (this._state === TransportState.CONNECTING || this._state === TransportState.RECONNECTING) {
      throw new ConnectionError('Already connecting', this.url)
    }
    if (this._state === TransportState.DESTROYED) {
      throw new ConnectionError('Transport destroyed', this.url)
    }

    this.intentionalClose = false
    this.setState(TransportState.CONNECTING)

    const WebSocketImpl = await this.getWebSocketImpl()

    return new Promise<void>((resolve, reject) => {
      try {
        this.ws = new WebSocketImpl(this.url) as WebSocket
      } catch (err) {
        this.setState(TransportState.DISCONNECTED)
        reject(new ConnectionError((err as Error).message, this.url))
        return
      }

      // Always attach close listener immediately to guarantee reconnect scheduling
      this.ws.addEventListener('close', (event: CloseEvent) => {
        this.stopKeepalive()
        this.emit('close', event.code, event.reason)
        if (!this.intentionalClose && this.autoReconnect && this._state !== TransportState.DESTROYED) {
          this.scheduleReconnect()
        } else if (this._state !== TransportState.DESTROYED) {
          this.setState(TransportState.DISCONNECTED)
        }
      })

      const onOpen = () => {
        this.ws?.removeEventListener('error', onError)
        this.reconnectAttempt = 0
        this.setState(TransportState.CONNECTED)
        this.setupListeners()
        this.startKeepalive()
        this.emit('open')
        resolve()
      }

      const onError = (event: Event) => {
        this.ws?.removeEventListener('open', onOpen)
        const err = new ConnectionError(
          (event as ErrorEvent).message || 'WebSocket connection failed',
          this.url
        )
        // State will transition via the close handler
        reject(err)
      }

      this.ws.addEventListener('open', onOpen)
      this.ws.addEventListener('error', onError)
    })
  }

  /** Close the connection without triggering auto-reconnect. */
  disconnect(): void {
    this.intentionalClose = true
    this.clearReconnectTimer()
    this.stopKeepalive()
    if (this.ws) {
      this.ws.close(1000, 'client disconnect')
      this.ws = null
    }
    if (this._state !== TransportState.DESTROYED) {
      this.setState(TransportState.DISCONNECTED)
    }
  }

  /** Permanently destroy the transport. No further connect() calls are allowed. */
  destroy(): void {
    this.disconnect()
    this.setState(TransportState.DESTROYED)
    this.listeners.clear()
  }

  /** Send data over the WebSocket. Throws if not connected. */
  send(data: string): void {
    if (this._state !== TransportState.CONNECTED || !this.ws) {
      throw new ConnectionError('Not connected', this.url)
    }
    this.ws.send(data)
  }

  // ── Private helpers ──────────────────────────────────────────────

  private setState(next: TransportState): void {
    const prev = this._state
    if (prev === next) return
    this._state = next
    this.emit('stateChange', next, prev)
  }

  private setupListeners(): void {
    if (!this.ws) return

    this.ws.addEventListener('message', (event: MessageEvent) => {
      const data = typeof event.data === 'string' ? event.data : event.data.toString()
      this.emit('message', data)
    })

    this.ws.addEventListener('error', () => {
      this.emit('error', new ConnectionError('WebSocket error', this.url))
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempt >= this.reconnectMaxRetries) {
      this.setState(TransportState.DISCONNECTED)
      this.emit('reconnectFailed')
      return
    }

    this.setState(TransportState.RECONNECTING)

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempt),
      this.reconnectMaxDelay,
    )
    this.reconnectAttempt++

    this.reconnectTimer = setTimeout(async () => {
      // Reset to allow connect() through the state guard
      this._state = TransportState.DISCONNECTED
      try {
        await this.connect()
      } catch {
        // close handler will trigger another scheduleReconnect
      }
    }, delay)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private startKeepalive(): void {
    if (this.keepaliveInterval <= 0) return
    // ws.ping() only exists on the Node `ws` package — browsers handle pings natively
    if (typeof globalThis.WebSocket !== 'undefined' && this.ws instanceof globalThis.WebSocket) return

    this.keepaliveTimer = setInterval(() => {
      if (this.ws && this._state === TransportState.CONNECTED) {
        try {
          (this.ws as unknown as { ping: () => void }).ping()
        } catch {
          // ignore — not available
        }
      }
    }, this.keepaliveInterval)
  }

  private stopKeepalive(): void {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer)
      this.keepaliveTimer = null
    }
  }

  private async getWebSocketImpl(): Promise<typeof WebSocket> {
    if (typeof globalThis.WebSocket !== 'undefined') {
      return globalThis.WebSocket
    }
    // Node.js — dynamic import
    try {
      const { default: WS } = await import('ws')
      return WS as unknown as typeof WebSocket
    } catch {
      throw new ConnectionError(
        'WebSocket implementation not found. Install the "ws" package for Node.js.',
        this.url,
      )
    }
  }
}
