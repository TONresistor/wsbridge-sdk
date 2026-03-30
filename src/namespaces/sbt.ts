import { BaseNamespace } from './base'
import type {
  SbtGetAuthorityAddressParams, SbtGetAuthorityAddressResult,
  SbtGetRevokedTimeParams, SbtGetRevokedTimeResult,
} from '../types'
import type { CallOptions } from '../rpc'

/** SBT namespace — soulbound token queries (TEP-85). */
export class SbtNamespace extends BaseNamespace {
  /** Get the authority address of a soulbound token. */
  getAuthorityAddress(params: SbtGetAuthorityAddressParams, options?: CallOptions): Promise<SbtGetAuthorityAddressResult> {
    return this.call('sbt.getAuthorityAddress', params, options)
  }

  /** Get the revocation timestamp of a soulbound token (0 = not revoked). */
  getRevokedTime(params: SbtGetRevokedTimeParams, options?: CallOptions): Promise<SbtGetRevokedTimeResult> {
    return this.call('sbt.getRevokedTime', params, options)
  }
}
