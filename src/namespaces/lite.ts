import { BaseNamespace } from './base'
import { SubscriptionManager, Subscription } from '../subscription'
import { RpcEngine, CallOptions } from '../rpc'
import type {
  LiteGetMasterchainInfoResult,
  LiteGetAccountStateParams, LiteGetAccountStateResult,
  LiteRunMethodParams, LiteRunMethodResult,
  LiteSendMessageParams, LiteSendMessageResult,
  LiteGetTransactionsParams, LiteGetTransactionsResult,
  LiteGetTransactionParams, LiteTransaction,
  LiteFindTxByInMsgHashParams,
  LiteFindTxByOutMsgHashParams,
  LiteGetTimeResult,
  LiteLookupBlockParams, LiteLookupBlockResult,
  LiteGetBlockTransactionsParams, LiteGetBlockTransactionsResult,
  LiteGetShardsResult,
  LiteGetBlockchainConfigParams, LiteGetBlockchainConfigResult,
  LiteSendAndWatchParams, LiteSendAndWatchResult,
  LiteGetBlockDataParams, LiteGetBlockDataResult,
  LiteGetBlockHeaderParams, LiteGetBlockHeaderResult,
  LiteGetLibrariesParams, LiteGetLibrariesResult,
  TxConfirmedEvent, TxTimeoutEvent,
} from '../types'

/** Union of events delivered to a sendAndWatch subscription. */
export type SendAndWatchEvent = TxConfirmedEvent | TxTimeoutEvent

/** Liteserver namespace — blockchain queries and transaction submission. */
export class LiteNamespace extends BaseNamespace {
  private manager: SubscriptionManager

  constructor(rpc: RpcEngine, manager: SubscriptionManager) {
    super(rpc)
    this.manager = manager
  }

  /** Get the latest masterchain block info. */
  getMasterchainInfo(options?: CallOptions): Promise<LiteGetMasterchainInfoResult> {
    return this.call('lite.getMasterchainInfo', undefined, options)
  }

  /** Get the state of an account. */
  getAccountState(params: LiteGetAccountStateParams, options?: CallOptions): Promise<LiteGetAccountStateResult> {
    return this.call('lite.getAccountState', params, options)
  }

  /** Run a get-method on a smart contract. */
  runMethod(params: LiteRunMethodParams, options?: CallOptions): Promise<LiteRunMethodResult> {
    return this.call('lite.runMethod', params, options)
  }

  /** Send an external message (fire and forget). */
  sendMessage(params: LiteSendMessageParams, options?: CallOptions): Promise<LiteSendMessageResult> {
    return this.call('lite.sendMessage', params, options)
  }

  /** Send an external message and wait for processing confirmation. */
  sendMessageWait(params: LiteSendMessageParams, options?: CallOptions): Promise<LiteSendMessageResult> {
    return this.call('lite.sendMessageWait', params, options)
  }

  /** Get account transactions with optional pagination. */
  getTransactions(params: LiteGetTransactionsParams, options?: CallOptions): Promise<LiteGetTransactionsResult> {
    return this.call('lite.getTransactions', params, options)
  }

  /** Get a single transaction by address and LT. */
  getTransaction(params: LiteGetTransactionParams, options?: CallOptions): Promise<LiteTransaction> {
    return this.call('lite.getTransaction', params, options)
  }

  /** Find a transaction by its inbound message hash. */
  findTxByInMsgHash(params: LiteFindTxByInMsgHashParams, options?: CallOptions): Promise<LiteTransaction> {
    return this.call('lite.findTxByInMsgHash', params, options)
  }

  /** Find a transaction by its outbound message hash. */
  findTxByOutMsgHash(params: LiteFindTxByOutMsgHashParams, options?: CallOptions): Promise<LiteTransaction> {
    return this.call('lite.findTxByOutMsgHash', params, options)
  }

  /** Get the current liteserver time. */
  getTime(options?: CallOptions): Promise<LiteGetTimeResult> {
    return this.call('lite.getTime', undefined, options)
  }

  /** Look up a block by workchain, shard, and seqno. */
  lookupBlock(params: LiteLookupBlockParams, options?: CallOptions): Promise<LiteLookupBlockResult> {
    return this.call('lite.lookupBlock', params, options)
  }

  /** Get short transaction references from a block. */
  getBlockTransactions(params: LiteGetBlockTransactionsParams, options?: CallOptions): Promise<LiteGetBlockTransactionsResult> {
    return this.call('lite.getBlockTransactions', params, options)
  }

  /** Get current shard descriptors. */
  getShards(options?: CallOptions): Promise<LiteGetShardsResult> {
    return this.call('lite.getShards', undefined, options)
  }

  /** Get blockchain configuration parameters. */
  getBlockchainConfig(params?: LiteGetBlockchainConfigParams, options?: CallOptions): Promise<LiteGetBlockchainConfigResult> {
    return this.call('lite.getBlockchainConfig', params, options)
  }

  /**
   * Send a message and subscribe to tx_confirmed / tx_timeout events.
   * Returns a Subscription that delivers {@link SendAndWatchEvent} push events.
   */
  async sendAndWatch(params: LiteSendAndWatchParams, options?: CallOptions): Promise<{ confirmation: LiteSendAndWatchResult; subscription: Subscription<SendAndWatchEvent> }> {
    const confirmation = await this.call('lite.sendAndWatch', params, options)
    if (!confirmation.watching) throw new Error('sendAndWatch rejected by bridge')

    const subId = confirmation.subscription_id
    const sub = this.manager.register<SendAndWatchEvent>('tx_confirmed', () => {
      this.rpc.call('subscribe.unsubscribe', { subscription_id: subId }).catch(() => {})
    })
    this.manager.setSubscriptionId(subId, sub as Subscription<unknown>)

    // Also route tx_timeout events to this subscription
    const timeoutSub = this.manager.register<SendAndWatchEvent>('tx_timeout', () => {})
    this.manager.setSubscriptionId(`${subId}:timeout`, timeoutSub as Subscription<unknown>)
    // Forward timeout events to the main subscription
    timeoutSub.on('data', (data) => sub._deliver(data))

    return { confirmation, subscription: sub }
  }

  /** Get the raw block BOC. */
  getBlockData(params: LiteGetBlockDataParams, options?: CallOptions): Promise<LiteGetBlockDataResult> {
    return this.call('lite.getBlockData', params, options)
  }

  /** Get the block header proof BOC. */
  getBlockHeader(params: LiteGetBlockHeaderParams, options?: CallOptions): Promise<LiteGetBlockHeaderResult> {
    return this.call('lite.getBlockHeader', params, options)
  }

  /** Get library cells by their hashes. */
  getLibraries(params: LiteGetLibrariesParams, options?: CallOptions): Promise<LiteGetLibrariesResult> {
    return this.call('lite.getLibraries', params, options)
  }
}
