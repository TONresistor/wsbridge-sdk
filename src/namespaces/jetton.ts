import { BaseNamespace } from './base'
import type {
  JettonGetDataParams, JettonGetDataResult,
  JettonGetWalletAddressParams, JettonGetWalletAddressResult,
  JettonGetBalanceParams, JettonGetBalanceResult,
} from '../types'
import type { CallOptions } from '../rpc'

/** Jetton namespace — fungible token queries (TEP-74). */
export class JettonNamespace extends BaseNamespace {
  /** Get jetton master data (supply, admin, content). */
  getData(params: JettonGetDataParams, options?: CallOptions): Promise<JettonGetDataResult> {
    return this.call('jetton.getData', params, options)
  }

  /** Compute the jetton wallet address for an owner. */
  getWalletAddress(params: JettonGetWalletAddressParams, options?: CallOptions): Promise<JettonGetWalletAddressResult> {
    return this.call('jetton.getWalletAddress', params, options)
  }

  /** Get balance of a jetton wallet. */
  getBalance(params: JettonGetBalanceParams, options?: CallOptions): Promise<JettonGetBalanceResult> {
    return this.call('jetton.getBalance', params, options)
  }
}
