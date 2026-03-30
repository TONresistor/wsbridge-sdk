import { BaseNamespace } from './base'
import type {
  WalletGetSeqnoParams, WalletGetSeqnoResult,
  WalletGetPublicKeyParams, WalletGetPublicKeyResult,
} from '../types'
import type { CallOptions } from '../rpc'

/** Wallet namespace — standard wallet contract queries. */
export class WalletNamespace extends BaseNamespace {
  /** Get the current seqno of a wallet contract. */
  getSeqno(params: WalletGetSeqnoParams, options?: CallOptions): Promise<WalletGetSeqnoResult> {
    return this.call('wallet.getSeqno', params, options)
  }

  /** Get the public key stored in a wallet contract. */
  getPublicKey(params: WalletGetPublicKeyParams, options?: CallOptions): Promise<WalletGetPublicKeyResult> {
    return this.call('wallet.getPublicKey', params, options)
  }
}
