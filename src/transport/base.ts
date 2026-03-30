/**
 * Transport state machine.
 * Transitions: DISCONNECTED → CONNECTING → CONNECTED → RECONNECTING → CONNECTED
 *                                                    → DESTROYED (terminal)
 */
export enum TransportState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  DESTROYED = 'DESTROYED',
}

export interface TransportEvents {
  open: () => void
  close: (code: number, reason: string) => void
  error: (error: Error) => void
  message: (data: string) => void
  stateChange: (newState: TransportState, oldState: TransportState) => void
  reconnectFailed: () => void
}

export type TransportEventName = keyof TransportEvents

/**
 * Base class for all transports. Provides a typed event emitter and lifecycle contract.
 */
export abstract class AbstractTransport {
  protected listeners = new Map<TransportEventName, Set<TransportEvents[TransportEventName]>>()

  abstract connect(): Promise<void>
  abstract disconnect(): void
  abstract send(data: string): void
  abstract get state(): TransportState

  /** Whether the transport is currently connected. */
  get isConnected(): boolean {
    return this.state === TransportState.CONNECTED
  }

  /** Register an event listener. */
  on<E extends TransportEventName>(event: E, listener: TransportEvents[E]): this {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(listener)
    return this
  }

  /** Remove an event listener. */
  off<E extends TransportEventName>(event: E, listener: TransportEvents[E]): this {
    this.listeners.get(event)?.delete(listener)
    return this
  }

  /** Register a one-shot event listener that auto-removes after the first call. */
  once<E extends TransportEventName>(event: E, listener: TransportEvents[E]): this {
    const wrapper = ((...args: unknown[]) => {
      this.off(event, wrapper as TransportEvents[E])
      ;(listener as (...a: unknown[]) => void)(...args)
    }) as TransportEvents[E]
    return this.on(event, wrapper)
  }

  /** Permanently tear down the transport. After this call, connect() will throw. */
  abstract destroy(): void

  protected emit<E extends TransportEventName>(event: E, ...args: Parameters<TransportEvents[E]>): void {
    const fns = this.listeners.get(event)
    if (fns) for (const fn of fns) (fn as (...a: unknown[]) => void)(...args)
  }
}
