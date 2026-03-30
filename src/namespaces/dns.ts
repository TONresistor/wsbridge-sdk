import { BaseNamespace } from './base'
import type { DnsResolveParams, DnsResolveResult } from '../types'
import type { CallOptions } from '../rpc'

/** DNS namespace — TON DNS domain resolution. */
export class DnsNamespace extends BaseNamespace {
  /** Resolve a .ton domain to wallet, site ADNL, text records, etc. */
  resolve(params: DnsResolveParams, options?: CallOptions): Promise<DnsResolveResult> {
    return this.call('dns.resolve', params, options)
  }
}
