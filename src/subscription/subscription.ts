/** Default maximum buffer size before oldest events are dropped. */
const DEFAULT_HIGH_WATER_MARK = 1000

export interface SubscriptionOptions {
  /** Maximum buffered events for the async iterator. Oldest are dropped when exceeded. Default: 1000. */
  highWaterMark?: number
}

/**
 * A typed subscription to push events from the bridge.
 * Supports both listener-based and async-iterator consumption.
 */
export class Subscription<T> {
  private listeners = new Set<(data: T) => void>()
  private errorListeners = new Set<(error: Error) => void>()
  private _active = true
  private _iteratorResolve: (() => void) | null = null
  private readonly highWaterMark: number

  constructor(
    public readonly event: string,
    private onUnsubscribe: () => void,
    options?: SubscriptionOptions,
  ) {
    this.highWaterMark = options?.highWaterMark ?? DEFAULT_HIGH_WATER_MARK
  }

  /** Whether the subscription is still active. */
  get active(): boolean { return this._active }

  /** Register a data or error listener. */
  on(event: 'data', listener: (data: T) => void): this
  on(event: 'error', listener: (error: Error) => void): this
  on(event: string, listener: (...args: never[]) => void): this {
    if (event === 'data') this.listeners.add(listener as (data: T) => void)
    else if (event === 'error') this.errorListeners.add(listener as (error: Error) => void)
    return this
  }

  /** Remove a data or error listener. */
  off(event: 'data', listener: (data: T) => void): this
  off(event: 'error', listener: (error: Error) => void): this
  off(event: string, listener: (...args: never[]) => void): this {
    if (event === 'data') this.listeners.delete(listener as (data: T) => void)
    else if (event === 'error') this.errorListeners.delete(listener as (error: Error) => void)
    return this
  }

  /** @internal Called by SubscriptionManager to deliver push events. */
  _deliver(data: T): void {
    if (!this._active) return
    for (const fn of this.listeners) fn(data)
  }

  /** @internal Called by SubscriptionManager on error. */
  _error(error: Error): void {
    for (const fn of this.errorListeners) fn(error)
  }

  /** Unsubscribe, releasing all listeners and unblocking any active async iterator. */
  async unsubscribe(): Promise<void> {
    if (!this._active) return
    this._active = false
    this.listeners.clear()
    this.errorListeners.clear()
    if (this._iteratorResolve) {
      this._iteratorResolve()
      this._iteratorResolve = null
    }
    this.onUnsubscribe()
  }

  /** Consume events as an async iterable. Respects backpressure via highWaterMark. */
  async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
    const buffer: T[] = []
    let resolve: (() => void) | null = null

    const listener = (data: T) => {
      buffer.push(data)
      // Backpressure: drop oldest events if buffer exceeds highWaterMark
      while (buffer.length > this.highWaterMark) {
        buffer.shift()
      }
      if (resolve) { resolve(); resolve = null }
    }

    this.on('data', listener)

    try {
      while (this._active) {
        if (buffer.length > 0) {
          yield buffer.shift()!
        } else {
          await new Promise<void>(r => {
            resolve = r
            this._iteratorResolve = r
          })
        }
      }
    } finally {
      this._iteratorResolve = null
      this.off('data', listener)
      await this.unsubscribe()
    }
  }
}
