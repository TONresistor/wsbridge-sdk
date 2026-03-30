import { BaseNamespace } from './base'
import type {
  PaymentGetChannelStateParams, PaymentGetChannelStateResult,
} from '../types'
import type { CallOptions } from '../rpc'

/** Payment namespace — payment channel queries. */
export class PaymentNamespace extends BaseNamespace {
  /** Get the state of a payment channel contract. */
  getChannelState(params: PaymentGetChannelStateParams, options?: CallOptions): Promise<PaymentGetChannelStateResult> {
    return this.call('payment.getChannelState', params, options)
  }
}
