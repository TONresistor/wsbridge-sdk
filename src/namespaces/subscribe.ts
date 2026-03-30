import { BaseNamespace } from './base'
import { SubscriptionManager, Subscription } from '../subscription'
import { RpcEngine, CallOptions } from '../rpc'
import type {
  SubscribeTransactionsParams,
  SubscribeAccountStateParams,
  SubscribeConfigChangesParams,
  SubscribeMultiAccountParams,
  SubscribeTraceParams,
  LiteTransaction, SubscribeBlockEvent,
  SubscribeAccountStateEvent, SubscribeNewTransactionEvent,
  SubscribeConfigChangedEvent,
  TraceStartedEvent, TraceTxEvent, TraceCompleteEvent, TraceTimeoutEvent,
} from '../types'

/** Union of all trace push events. */
export type TraceEvent = TraceStartedEvent | TraceTxEvent | TraceCompleteEvent | TraceTimeoutEvent

/** Subscribe namespace — real-time event subscriptions. */
export class SubscribeNamespace extends BaseNamespace {
  private manager: SubscriptionManager

  constructor(rpc: RpcEngine, manager: SubscriptionManager) {
    super(rpc)
    this.manager = manager
  }

  /** Subscribe to transactions for a specific account. */
  async transactions(params: SubscribeTransactionsParams, options?: CallOptions): Promise<Subscription<LiteTransaction>> {
    const confirmation = await this.call('subscribe.transactions', params, options)
    if (!confirmation.subscribed) throw new Error('Subscription rejected')

    const subId = confirmation.subscription_id
    const sub = this.manager.register<LiteTransaction>('transaction', () => {
      this.rpc.call('subscribe.unsubscribe', { subscription_id: subId }).catch(() => {})
    })
    this.manager.setSubscriptionId(subId, sub as Subscription<unknown>)
    return sub
  }

  /** Subscribe to new masterchain blocks. */
  async blocks(options?: CallOptions): Promise<Subscription<SubscribeBlockEvent>> {
    const confirmation = await this.call('subscribe.blocks', undefined, options)
    if (!confirmation.subscribed) throw new Error('Subscription rejected')

    const subId = confirmation.subscription_id
    const sub = this.manager.register<SubscribeBlockEvent>('block', () => {
      this.rpc.call('subscribe.unsubscribe', { subscription_id: subId }).catch(() => {})
    })
    this.manager.setSubscriptionId(subId, sub as Subscription<unknown>)
    return sub
  }

  /** Subscribe to account state changes. */
  async accountState(params: SubscribeAccountStateParams, options?: CallOptions): Promise<Subscription<SubscribeAccountStateEvent>> {
    const confirmation = await this.call('subscribe.accountState', params, options)
    if (!confirmation.subscribed) throw new Error('Subscription rejected')

    const subId = confirmation.subscription_id
    const sub = this.manager.register<SubscribeAccountStateEvent>('account_state', () => {
      this.rpc.call('subscribe.unsubscribe', { subscription_id: subId }).catch(() => {})
    })
    this.manager.setSubscriptionId(subId, sub as Subscription<unknown>)
    return sub
  }

  /** Subscribe to all new transactions across the blockchain. */
  async newTransactions(options?: CallOptions): Promise<Subscription<SubscribeNewTransactionEvent>> {
    const confirmation = await this.call('subscribe.newTransactions', undefined, options)
    if (!confirmation.subscribed) throw new Error('Subscription rejected')

    const subId = confirmation.subscription_id
    const sub = this.manager.register<SubscribeNewTransactionEvent>('new_transaction', () => {
      this.rpc.call('subscribe.unsubscribe', { subscription_id: subId }).catch(() => {})
    })
    this.manager.setSubscriptionId(subId, sub as Subscription<unknown>)
    return sub
  }

  /** Subscribe to blockchain config parameter changes. */
  async configChanges(params: SubscribeConfigChangesParams, options?: CallOptions): Promise<Subscription<SubscribeConfigChangedEvent>> {
    const confirmation = await this.call('subscribe.configChanges', params, options)
    if (!confirmation.subscribed) throw new Error('Subscription rejected')

    const subId = confirmation.subscription_id
    const sub = this.manager.register<SubscribeConfigChangedEvent>('config_changed', () => {
      this.rpc.call('subscribe.unsubscribe', { subscription_id: subId }).catch(() => {})
    })
    this.manager.setSubscriptionId(subId, sub as Subscription<unknown>)
    return sub
  }

  /** Subscribe to transactions across multiple accounts. */
  async multiAccount(params: SubscribeMultiAccountParams, options?: CallOptions): Promise<Subscription<LiteTransaction>> {
    const confirmation = await this.call('subscribe.multiAccount', params, options)
    if (!confirmation.subscribed) throw new Error('Subscription rejected')

    const subId = confirmation.subscription_id
    const sub = this.manager.register<LiteTransaction>('transaction', () => {
      this.rpc.call('subscribe.unsubscribe', { subscription_id: subId }).catch(() => {})
    })
    this.manager.setSubscriptionId(subId, sub as Subscription<unknown>)
    return sub
  }

  /**
   * Subscribe to transaction traces (internal message chains).
   * Returns a subscription that delivers trace_started, trace_tx, trace_complete, and trace_timeout events.
   */
  async trace(params: SubscribeTraceParams, options?: CallOptions): Promise<Subscription<TraceEvent>> {
    const confirmation = await this.call('subscribe.trace', params, options)
    if (!confirmation.subscribed) throw new Error('Subscription rejected')

    const subId = confirmation.subscription_id
    const sub = this.manager.register<TraceEvent>('trace_started', () => {
      this.rpc.call('subscribe.unsubscribe', { subscription_id: subId }).catch(() => {})
    })
    this.manager.setSubscriptionId(subId, sub as Subscription<unknown>)

    // Route additional trace events to the same subscription
    const traceEvents = ['trace_tx', 'trace_complete', 'trace_timeout'] as const
    for (const evt of traceEvents) {
      const aux = this.manager.register<TraceEvent>(evt, () => {})
      aux.on('data', (data) => sub._deliver(data))
    }

    return sub
  }
}
