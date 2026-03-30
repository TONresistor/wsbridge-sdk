import { BaseNamespace } from './base'
import type {
  DhtFindAddressesParams, DhtFindAddressesResult,
  DhtFindOverlayNodesParams, DhtFindOverlayNodesResult,
  DhtFindTunnelNodesResult,
  DhtFindValueParams, DhtFindValueResult,
} from '../types'
import type { CallOptions } from '../rpc'

/** DHT namespace — distributed hash table lookups. */
export class DhtNamespace extends BaseNamespace {
  /** Look up ADNL addresses for a given key. */
  findAddresses(params: DhtFindAddressesParams, options?: CallOptions): Promise<DhtFindAddressesResult> {
    return this.call('dht.findAddresses', params, options)
  }

  /** Find overlay nodes for a given overlay key. */
  findOverlayNodes(params: DhtFindOverlayNodesParams, options?: CallOptions): Promise<DhtFindOverlayNodesResult> {
    return this.call('dht.findOverlayNodes', params, options)
  }

  /** Discover tunnel relay nodes from the DHT. */
  findTunnelNodes(options?: CallOptions): Promise<DhtFindTunnelNodesResult> {
    return this.call('dht.findTunnelNodes', undefined, options)
  }

  /** Look up an arbitrary value in the DHT. */
  findValue(params: DhtFindValueParams, options?: CallOptions): Promise<DhtFindValueResult> {
    return this.call('dht.findValue', params, options)
  }
}
