import { AbstractTransport } from '../transport'
import { RpcError, ConnectionClosedError, TimeoutError } from '../errors'

interface PendingCall<T = unknown> {
  resolve: (value: T) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
  method: string
  abortHandler?: () => void
  signal?: AbortSignal
}

export type PushHandler = (event: string, data: unknown) => void

/** Logger interface accepted by RpcEngine. */
export interface Logger {
  debug: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

export interface RpcEngineOptions {
  requestTimeout?: number
  logger?: Logger
}

/** Options for individual RPC calls. */
export interface CallOptions {
  signal?: AbortSignal
}

/** Counter-based fallback for ID generation when crypto.randomUUID is unavailable. */
let idCounter = 0
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  idCounter = (idCounter + 1) % 0x80000000 // wrap at 2^31
  return String(idCounter)
}

/**
 * JSON-RPC 2.0 engine over an AbstractTransport.
 * Handles request/response correlation, timeouts, push events, and abort signals.
 */
export class RpcEngine {
  private pending = new Map<string, PendingCall>()
  private pushHandler: PushHandler | null = null
  private readonly requestTimeout: number
  private readonly logger: Logger | null

  constructor(
    private transport: AbstractTransport,
    options: RpcEngineOptions = {},
  ) {
    this.requestTimeout = options.requestTimeout ?? 30_000
    this.logger = options.logger ?? null
    this.transport.on('message', (data) => this.handleMessage(data))
    this.transport.on('close', () => this.rejectAll('Connection closed'))
  }

  /** Register a handler for push events (subscriptions, ADNL). */
  setPushHandler(handler: PushHandler): void {
    this.pushHandler = handler
  }

  /**
   * Send a JSON-RPC 2.0 request and return the result.
   * @param method - The RPC method name.
   * @param params - Optional parameters.
   * @param options - Optional call options (abort signal).
   */
  call<T>(method: string, params?: unknown, options?: CallOptions): Promise<T> {
    const id = generateId()

    // Reject immediately if already aborted
    if (options?.signal?.aborted) {
      return Promise.reject(new TimeoutError(method, 0))
    }

    return new Promise<T>((resolve, reject) => {
      const cleanup = () => {
        const call = this.pending.get(id)
        if (call?.abortHandler && options?.signal) {
          options.signal.removeEventListener('abort', call.abortHandler)
        }
        this.pending.delete(id)
      }

      const timer = setTimeout(() => {
        cleanup()
        this.logger?.warn('RPC timeout', method, id)
        reject(new TimeoutError(method, this.requestTimeout))
      }, this.requestTimeout)

      const call: PendingCall = {
        resolve: resolve as (v: unknown) => void,
        reject,
        timer,
        method,
      }

      // Abort signal support
      if (options?.signal) {
        const abortHandler = () => {
          clearTimeout(timer)
          cleanup()
          reject(new TimeoutError(method, 0))
        }
        call.abortHandler = abortHandler
        call.signal = options.signal
        options.signal.addEventListener('abort', abortHandler, { once: true })
      }

      this.pending.set(id, call)

      const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params: params ?? {} })
      this.logger?.debug('RPC →', method, id)

      try {
        this.transport.send(msg)
      } catch (err) {
        clearTimeout(timer)
        cleanup()
        reject(err)
      }
    })
  }

  private handleMessage(raw: string): void {
    let msg: {
      jsonrpc?: string
      id?: string | number | null
      result?: unknown
      error?: { code: number; message: string } | null
      event?: string
      data?: unknown
    }
    try {
      msg = JSON.parse(raw)
    } catch {
      return // malformed JSON, ignore
    }

    // Response to a pending call — use != null for falsy-safe check (id could be 0 or "")
    if (msg.id != null && this.pending.has(String(msg.id))) {
      const id = String(msg.id)
      const call = this.pending.get(id)!
      clearTimeout(call.timer)
      if (call.abortHandler && call.signal) {
        call.signal.removeEventListener('abort', call.abortHandler)
      }
      this.pending.delete(id)

      if (msg.error) {
        this.logger?.error('RPC error', call.method, msg.error)
        call.reject(new RpcError(msg.error.message, msg.error.code))
      } else {
        this.logger?.debug('RPC ←', call.method, id)
        call.resolve(msg.result)
      }
      return
    }

    // Push event (subscription or ADNL)
    if (msg.event && this.pushHandler) {
      this.pushHandler(msg.event, msg.data)
    }
  }

  private rejectAll(reason: string): void {
    for (const [, call] of this.pending) {
      clearTimeout(call.timer)
      call.reject(new ConnectionClosedError(1006, `${reason} (pending: ${call.method})`))
    }
    this.pending.clear()
  }

  /** Destroy the engine, rejecting all pending calls. */
  destroy(): void {
    this.rejectAll('RPC engine destroyed')
    this.pushHandler = null
  }
}
