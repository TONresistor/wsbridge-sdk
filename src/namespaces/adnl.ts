import { BaseNamespace } from './base'
import { SubscriptionManager } from '../subscription'
import { RpcEngine, CallOptions } from '../rpc'
import type {
  AdnlConnectParams, AdnlConnectResult,
  AdnlConnectByAdnlParams,
  AdnlSendMessageParams, AdnlSendMessageResult,
  AdnlPingParams, AdnlPingResult,
  AdnlDisconnectParams, AdnlDisconnectResult,
  AdnlPeersResult,
  AdnlQueryParams, AdnlQueryResult,
  AdnlSetQueryHandlerParams, AdnlSetQueryHandlerResult,
  AdnlAnswerParams, AdnlAnswerResult,
  AdnlMessageEvent, AdnlDisconnectedEvent,
  AdnlIncomingConnectionEvent, AdnlQueryReceivedEvent,
} from '../types'

/** Map of friendly event names to their wire event names and data types. */
type AdnlEventMap = {
  'message': AdnlMessageEvent
  'disconnected': AdnlDisconnectedEvent
  'incomingConnection': AdnlIncomingConnectionEvent
  'queryReceived': AdnlQueryReceivedEvent
}

const EVENT_LOOKUP: Record<keyof AdnlEventMap, string> = {
  message: 'adnl.message',
  disconnected: 'adnl.disconnected',
  incomingConnection: 'adnl.incomingConnection',
  queryReceived: 'adnl.queryReceived',
}

/** ADNL namespace — low-level peer-to-peer messaging. */
export class AdnlNamespace extends BaseNamespace {
  private manager: SubscriptionManager

  constructor(rpc: RpcEngine, manager: SubscriptionManager) {
    super(rpc)
    this.manager = manager
  }

  /** Connect to a peer by IP address and public key. */
  connect(params: AdnlConnectParams, options?: CallOptions): Promise<AdnlConnectResult> {
    return this.call('adnl.connect', params, options)
  }

  /** Connect to a peer by ADNL ID (resolved via DHT). */
  connectByADNL(params: AdnlConnectByAdnlParams, options?: CallOptions): Promise<AdnlConnectResult> {
    return this.call('adnl.connectByADNL', params, options)
  }

  /** Send an unreliable message to a connected peer. */
  sendMessage(params: AdnlSendMessageParams, options?: CallOptions): Promise<AdnlSendMessageResult> {
    return this.call('adnl.sendMessage', params, options)
  }

  /** Ping a connected peer. */
  ping(params: AdnlPingParams, options?: CallOptions): Promise<AdnlPingResult> {
    return this.call('adnl.ping', params, options)
  }

  /** Disconnect from a peer. */
  disconnect(params: AdnlDisconnectParams, options?: CallOptions): Promise<AdnlDisconnectResult> {
    return this.call('adnl.disconnect', params, options)
  }

  /** List all connected ADNL peers. */
  peers(options?: CallOptions): Promise<AdnlPeersResult> {
    return this.call('adnl.peers', undefined, options)
  }

  /** Send a TL query to a peer and wait for the response. */
  query(params: AdnlQueryParams, options?: CallOptions): Promise<AdnlQueryResult> {
    return this.call('adnl.query', params, options)
  }

  /** Enable the query handler for a peer (receive queryReceived events). */
  setQueryHandler(params: AdnlSetQueryHandlerParams, options?: CallOptions): Promise<AdnlSetQueryHandlerResult> {
    return this.call('adnl.setQueryHandler', params, options)
  }

  /** Answer a received query. */
  answer(params: AdnlAnswerParams, options?: CallOptions): Promise<AdnlAnswerResult> {
    return this.call('adnl.answer', params, options)
  }

  /** Register a listener for ADNL push events. */
  on<K extends keyof AdnlEventMap>(event: K, listener: (data: AdnlEventMap[K]) => void): this {
    this.manager.onAdnl(EVENT_LOOKUP[event], listener as (data: unknown) => void)
    return this
  }

  /** Remove a listener for ADNL push events. */
  off<K extends keyof AdnlEventMap>(event: K, listener: (data: AdnlEventMap[K]) => void): this {
    this.manager.offAdnl(EVENT_LOOKUP[event], listener as (data: unknown) => void)
    return this
  }
}
