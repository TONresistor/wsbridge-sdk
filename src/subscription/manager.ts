import { Subscription, SubscriptionOptions } from './subscription'

/** Listener type for raw ADNL events. */
export type AdnlListener = (data: unknown) => void

/**
 * Manages subscriptions and ADNL event listeners.
 * Routes push events from the RPC engine to the correct subscription or listener.
 */
export class SubscriptionManager {
  private subscriptions = new Map<string, Set<Subscription<unknown>>>()
  private adnlListeners = new Map<string, Set<AdnlListener>>()
  private subscriptionIds = new Map<string, Subscription<unknown>>()

  /** Register a subscription for a push event type. */
  register<T>(
    eventType: string,
    onUnsubscribe: () => void,
    options?: SubscriptionOptions,
  ): Subscription<T> {
    const sub = new Subscription<T>(eventType, () => {
      const subs = this.subscriptions.get(eventType)
      if (subs) {
        subs.delete(sub as Subscription<unknown>)
        if (subs.size === 0) this.subscriptions.delete(eventType)
      }
      // Remove subscription ID mapping
      for (const [id, s] of this.subscriptionIds) {
        if (s === (sub as Subscription<unknown>)) {
          this.subscriptionIds.delete(id)
          break
        }
      }
      onUnsubscribe()
    }, options)

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Set())
    }
    this.subscriptions.get(eventType)!.add(sub as Subscription<unknown>)
    return sub
  }

  /** Store the bridge-assigned subscription ID for a subscription. */
  setSubscriptionId(subscriptionId: string, subscription: Subscription<unknown>): void {
    this.subscriptionIds.set(subscriptionId, subscription)
  }

  /** Get a subscription by its bridge-assigned ID. */
  getBySubscriptionId(subscriptionId: string): Subscription<unknown> | undefined {
    return this.subscriptionIds.get(subscriptionId)
  }

  /** Route a push event to all matching subscriptions. */
  handleEvent(event: string, data: unknown): void {
    const subs = this.subscriptions.get(event)
    if (subs) {
      for (const sub of subs) sub._deliver(data)
    }

    const listeners = this.adnlListeners.get(event)
    if (listeners) {
      for (const fn of listeners) fn(data)
    }
  }

  /** Register an ADNL event listener. */
  onAdnl(event: string, listener: AdnlListener): void {
    if (!this.adnlListeners.has(event)) {
      this.adnlListeners.set(event, new Set())
    }
    this.adnlListeners.get(event)!.add(listener)
  }

  /** Remove an ADNL event listener. */
  offAdnl(event: string, listener: AdnlListener): void {
    this.adnlListeners.get(event)?.delete(listener)
  }

  /**
   * Returns all active subscriptions as event-type entries for resubscription after reconnect.
   * The caller (typically the client) should iterate this list and re-send subscribe RPCs
   * to the bridge, then update subscription IDs via setSubscriptionId().
   */
  getResubscribeEntries(): Array<{ eventType: string; subscription: Subscription<unknown> }> {
    const entries: Array<{ eventType: string; subscription: Subscription<unknown> }> = []
    for (const [eventType, subs] of this.subscriptions) {
      for (const sub of subs) {
        if (sub.active) {
          entries.push({ eventType, subscription: sub })
        }
      }
    }
    return entries
  }

  /**
   * Resubscribe all active subscriptions after a reconnect.
   * Accepts a callback that performs the actual RPC subscribe call for each entry
   * and returns the new subscription_id from the bridge.
   * Old subscription IDs are cleared and replaced with new ones.
   */
  async resubscribe(
    doSubscribe: (eventType: string) => Promise<string>,
  ): Promise<void> {
    // Clear stale bridge-assigned IDs
    this.subscriptionIds.clear()

    const entries = this.getResubscribeEntries()
    for (const { eventType, subscription } of entries) {
      const newId = await doSubscribe(eventType)
      this.subscriptionIds.set(newId, subscription)
    }
  }

  /** Number of active subscriptions (for debugging). */
  get activeCount(): number {
    let count = 0
    for (const subs of this.subscriptions.values()) count += subs.size
    return count
  }

  /** Clear all subscriptions and ADNL listeners (e.g. on disconnect). */
  clear(): void {
    for (const [, subs] of this.subscriptions) {
      for (const sub of subs) {
        sub._error(new Error('Connection closed'))
      }
    }
    this.subscriptions.clear()
    this.adnlListeners.clear()
    this.subscriptionIds.clear()
  }
}
