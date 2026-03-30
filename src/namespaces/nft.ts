import { BaseNamespace } from './base'
import type {
  NftGetDataParams, NftGetDataResult,
  NftGetCollectionDataParams, NftGetCollectionDataResult,
  NftGetAddressByIndexParams, NftGetAddressByIndexResult,
  NftGetRoyaltyParamsParams, NftGetRoyaltyParamsResult,
  NftGetContentParams, NftGetContentResult,
} from '../types'
import type { CallOptions } from '../rpc'

/** NFT namespace — non-fungible token queries (TEP-62). */
export class NftNamespace extends BaseNamespace {
  /** Get individual NFT item data. */
  getData(params: NftGetDataParams, options?: CallOptions): Promise<NftGetDataResult> {
    return this.call('nft.getData', params, options)
  }

  /** Get NFT collection data. */
  getCollectionData(params: NftGetCollectionDataParams, options?: CallOptions): Promise<NftGetCollectionDataResult> {
    return this.call('nft.getCollectionData', params, options)
  }

  /** Get the NFT item address by collection index. */
  getAddressByIndex(params: NftGetAddressByIndexParams, options?: CallOptions): Promise<NftGetAddressByIndexResult> {
    return this.call('nft.getAddressByIndex', params, options)
  }

  /** Get royalty parameters for a collection. */
  getRoyaltyParams(params: NftGetRoyaltyParamsParams, options?: CallOptions): Promise<NftGetRoyaltyParamsResult> {
    return this.call('nft.getRoyaltyParams', params, options)
  }

  /** Resolve the full content URI for an NFT by combining collection and individual content. */
  getContent(params: NftGetContentParams, options?: CallOptions): Promise<NftGetContentResult> {
    return this.call('nft.getContent', params, options)
  }
}
