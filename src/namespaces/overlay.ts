import { BaseNamespace } from './base'
import { SubscriptionManager } from '../subscription'
import { RpcEngine, CallOptions } from '../rpc'
import type {
  OverlayJoinParams, OverlayJoinResult,
  OverlayLeaveParams, OverlayLeaveResult,
  OverlayGetPeersParams, OverlayGetPeersResult,
  OverlaySendMessageParams, OverlaySendMessageResult,
  OverlayQueryParams, OverlayQueryResult,
  OverlaySetQueryHandlerParams, OverlaySetQueryHandlerResult,
  OverlayAnswerParams, OverlayAnswerResult,
  OverlayBroadcastEvent, OverlayMessageEvent, OverlayQueryReceivedEvent,
} from '../types'

/** Map of friendly event names to their wire event names and data types. */
type OverlayEventMap = {
  'broadcast': OverlayBroadcastEvent
  'message': OverlayMessageEvent
  'queryReceived': OverlayQueryReceivedEvent
}

const EVENT_LOOKUP: Record<keyof OverlayEventMap, string> = {
  broadcast: 'overlay.broadcast',
  message: 'overlay.message',
  queryReceived: 'overlay.queryReceived',
}

/** Overlay namespace — P2P pubsub overlay networks. */
export class OverlayNamespace extends BaseNamespace {
  private manager: SubscriptionManager

  constructor(rpc: RpcEngine, manager: SubscriptionManager) {
    super(rpc)
    this.manager = manager
  }

  /** Join an overlay network. */
  join(params: OverlayJoinParams, options?: CallOptions): Promise<OverlayJoinResult> {
    return this.call('overlay.join', params, options)
  }

  /** Leave an overlay network. */
  leave(params: OverlayLeaveParams, options?: CallOptions): Promise<OverlayLeaveResult> {
    return this.call('overlay.leave', params, options)
  }

  /** Get peers in an overlay network. */
  getPeers(params: OverlayGetPeersParams, options?: CallOptions): Promise<OverlayGetPeersResult> {
    return this.call('overlay.getPeers', params, options)
  }

  /** Send a broadcast message to all overlay peers. */
  sendMessage(params: OverlaySendMessageParams, options?: CallOptions): Promise<OverlaySendMessageResult> {
    return this.call('overlay.sendMessage', params, options)
  }

  /** Send a TL query through the overlay and wait for the response. */
  query(params: OverlayQueryParams, options?: CallOptions): Promise<OverlayQueryResult> {
    return this.call('overlay.query', params, options)
  }

  /** Enable the query handler for an overlay (receive queryReceived events). */
  setQueryHandler(params: OverlaySetQueryHandlerParams, options?: CallOptions): Promise<OverlaySetQueryHandlerResult> {
    return this.call('overlay.setQueryHandler', params, options)
  }

  /** Answer a received overlay query. */
  answer(params: OverlayAnswerParams, options?: CallOptions): Promise<OverlayAnswerResult> {
    return this.call('overlay.answer', params, options)
  }

  /** Register a listener for overlay push events. */
  on<K extends keyof OverlayEventMap>(event: K, listener: (data: OverlayEventMap[K]) => void): this {
    this.manager.onAdnl(EVENT_LOOKUP[event], listener as (data: unknown) => void)
    return this
  }

  /** Remove a listener for overlay push events. */
  off<K extends keyof OverlayEventMap>(event: K, listener: (data: OverlayEventMap[K]) => void): this {
    this.manager.offAdnl(EVENT_LOOKUP[event], listener as (data: unknown) => void)
    return this
  }
}
