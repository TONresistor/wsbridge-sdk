import { createTransport, AbstractTransport, TransportState, WsTransportOptions } from './transport'
import { RpcEngine, Logger } from './rpc'
import { SubscriptionManager } from './subscription'
import { DhtNamespace } from './namespaces/dht'
import { LiteNamespace } from './namespaces/lite'
import { SubscribeNamespace } from './namespaces/subscribe'
import { JettonNamespace } from './namespaces/jetton'
import { NftNamespace } from './namespaces/nft'
import { DnsNamespace } from './namespaces/dns'
import { AdnlNamespace } from './namespaces/adnl'
import { NetworkNamespace } from './namespaces/network'
import { OverlayNamespace } from './namespaces/overlay'
import { WalletNamespace } from './namespaces/wallet'
import { SbtNamespace } from './namespaces/sbt'
import { PaymentNamespace } from './namespaces/payment'

/** Options for creating a {@link Web3SocketsClient}. */
export interface ClientOptions extends WsTransportOptions {
  /** Pre-built transport instance (overrides URL-based auto-detection). */
  transport?: AbstractTransport
  /** RPC request timeout in milliseconds (default: 30 000). */
  requestTimeout?: number
  /** Optional logger for debug/warn/error output. */
  logger?: Logger
}

/** Typed client event map. */
interface ClientEventMap {
  connected: () => void
  disconnected: (code: number, reason: string) => void
  error: (err: Error) => void
  stateChange: (newState: TransportState, oldState: TransportState) => void
}

type ClientEventName = keyof ClientEventMap

/**
 * High-level client for the TON WebSocket JSON-RPC bridge.
 * Provides typed namespace accessors for all 58+ bridge methods.
 */
export class Web3SocketsClient {
  private transport: AbstractTransport
  private rpc: RpcEngine
  private subscriptionManager: SubscriptionManager
  private clientListeners = new Map<ClientEventName, Set<ClientEventMap[ClientEventName]>>()

  /** DHT namespace — distributed hash table lookups. */
  readonly dht: DhtNamespace
  /** Liteserver namespace — blockchain queries and transaction submission. */
  readonly lite: LiteNamespace
  /** Subscribe namespace — real-time event subscriptions. */
  readonly subscribe: SubscribeNamespace
  /** Jetton namespace — fungible token queries. */
  readonly jetton: JettonNamespace
  /** NFT namespace — non-fungible token queries. */
  readonly nft: NftNamespace
  /** DNS namespace — TON DNS domain resolution. */
  readonly dns: DnsNamespace
  /** ADNL namespace — low-level peer-to-peer messaging. */
  readonly adnl: AdnlNamespace
  /** Network namespace — bridge status. */
  readonly network: NetworkNamespace
  /** Overlay namespace — P2P pubsub overlay networks. */
  readonly overlay: OverlayNamespace
  /** Wallet namespace — standard wallet contract queries. */
  readonly wallet: WalletNamespace
  /** SBT namespace — soulbound token queries. */
  readonly sbt: SbtNamespace
  /** Payment namespace — payment channel queries. */
  readonly payment: PaymentNamespace

  constructor(options: ClientOptions = {}) {
    this.transport = options.transport ?? createTransport(options)
    this.rpc = new RpcEngine(this.transport, {
      requestTimeout: options.requestTimeout,
      logger: options.logger,
    })
    this.subscriptionManager = new SubscriptionManager()

    this.rpc.setPushHandler((event, data) => {
      this.subscriptionManager.handleEvent(event, data)
    })

    this.transport.on('open', () => this.emitClient('connected'))
    this.transport.on('close', (code: number, reason: string) => {
      this.subscriptionManager.clear()
      this.emitClient('disconnected', code, reason)
    })
    this.transport.on('error', (err: Error) => this.emitClient('error', err))
    this.transport.on('stateChange', (newState: TransportState, oldState: TransportState) => {
      this.emitClient('stateChange', newState, oldState)
    })

    this.dht = new DhtNamespace(this.rpc)
    this.lite = new LiteNamespace(this.rpc, this.subscriptionManager)
    this.subscribe = new SubscribeNamespace(this.rpc, this.subscriptionManager)
    this.jetton = new JettonNamespace(this.rpc)
    this.nft = new NftNamespace(this.rpc)
    this.dns = new DnsNamespace(this.rpc)
    this.adnl = new AdnlNamespace(this.rpc, this.subscriptionManager)
    this.network = new NetworkNamespace(this.rpc)
    this.overlay = new OverlayNamespace(this.rpc, this.subscriptionManager)
    this.wallet = new WalletNamespace(this.rpc)
    this.sbt = new SbtNamespace(this.rpc)
    this.payment = new PaymentNamespace(this.rpc)
  }

  /** Open the transport connection. */
  async connect(): Promise<void> {
    await this.transport.connect()
  }

  /** Gracefully close the transport connection. */
  disconnect(): void {
    this.transport.disconnect()
  }

  /** Whether the transport is currently connected. */
  get isConnected(): boolean {
    return this.transport.isConnected
  }

  /** Current transport state. */
  get state(): TransportState {
    return this.transport.state
  }

  /** Permanently tear down the client, releasing all resources. */
  destroy(): void {
    this.rpc.destroy()
    this.transport.destroy()
    this.clientListeners.clear()
  }

  /** Register a client event listener. */
  on<E extends ClientEventName>(event: E, listener: ClientEventMap[E]): this {
    if (!this.clientListeners.has(event)) {
      this.clientListeners.set(event, new Set())
    }
    this.clientListeners.get(event)!.add(listener)
    return this
  }

  /** Remove a client event listener. */
  off<E extends ClientEventName>(event: E, listener: ClientEventMap[E]): this {
    this.clientListeners.get(event)?.delete(listener)
    return this
  }

  private emitClient<E extends ClientEventName>(event: E, ...args: Parameters<ClientEventMap[E]>): void {
    const fns = this.clientListeners.get(event)
    if (fns) for (const fn of fns) (fn as (...a: unknown[]) => void)(...args)
  }
}
