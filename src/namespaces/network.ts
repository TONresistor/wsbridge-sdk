import { BaseNamespace } from './base'
import type { NetworkInfoResult } from '../types'
import type { CallOptions } from '../rpc'

/** Network namespace — bridge and DHT status. */
export class NetworkNamespace extends BaseNamespace {
  /** Get bridge network information (DHT status, connected WS clients). */
  info(options?: CallOptions): Promise<NetworkInfoResult> {
    return this.call('network.info', undefined, options)
  }
}
