// =============================================================================
// Wire protocol types — field names match Go wsbridge JSON tags exactly.
// 61/61 methods covered.
// =============================================================================

// --- JSON-RPC envelope ---

/** JSON-RPC 2.0 request sent over the WebSocket. */
export interface WSRequest {
  jsonrpc: '2.0'
  id: string
  method: string
  params?: unknown
}

/** JSON-RPC 2.0 response received from the bridge. */
export interface WSResponse {
  jsonrpc: string
  id: string
  result?: unknown
  error?: { code: number; message: string } | null
}

// --- Push event envelope (subscriptions + ADNL events) ---

/** Server-pushed event for subscriptions and ADNL/overlay notifications. */
export interface WSEvent<T = unknown> {
  event: string
  data: T
}

// =============================================================================
// Shared types
// =============================================================================

/**
 * TEP-64 content for NFTs. Serialized by Go `serializeContent`.
 * Fields beyond `type`+`uri` are present only when the on-chain data includes them.
 */
export type NftTepContent =
  | { type: 'offchain'; uri: string }
  | { type: 'semichain'; uri: string; name?: string; description?: string; image?: string; image_data?: string }
  | { type: 'onchain'; name?: string; description?: string; image?: string; image_data?: string }
  | { type: 'unknown' }

/**
 * TEP-64 content for jettons. Serialized by Go `serializeJettonContent`.
 * Includes `symbol` and `decimals` fields specific to fungible tokens.
 */
export type JettonTepContent =
  | { type: 'offchain'; uri: string }
  | { type: 'semichain'; uri: string; name?: string; symbol?: string; decimals?: string; description?: string; image?: string }
  | { type: 'onchain'; name?: string; symbol?: string; decimals?: string; description?: string; image?: string; image_data?: string }
  | { type: 'unknown' }

// =============================================================================
// DHT
// =============================================================================

/** Params for `dht.findAddresses`. */
export interface DhtFindAddressesParams {
  /** Base64-encoded ADNL ID to look up. */
  key: string
}

/** A single address returned by the DHT. */
export interface DhtAddress {
  ip: string
  port: number
}

/** Result of `dht.findAddresses`. */
export interface DhtFindAddressesResult {
  addresses: DhtAddress[]
  /** Base64-encoded ed25519 public key. */
  pubkey: string
}

/** Params for `dht.findOverlayNodes`. */
export interface DhtFindOverlayNodesParams {
  /** Base64-encoded overlay key. */
  overlay_key: string
}

/** A single overlay node returned by the DHT. */
export interface OverlayNodeInfo {
  /** Base64-encoded ed25519 public key. */
  id: string
  /** Base64-encoded overlay ID. */
  overlay: string
  version: number
}

/** Result of `dht.findOverlayNodes`. */
export interface DhtFindOverlayNodesResult {
  nodes: OverlayNodeInfo[]
  count: number
}

/** Params for `dht.findTunnelNodes`. */
// no params

/** A single relay node returned by the DHT. */
export interface DhtRelayInfo {
  /** Base64-encoded ADNL ID. */
  adnl_id: string
  version: number
}

/** Result of `dht.findTunnelNodes`. */
export interface DhtFindTunnelNodesResult {
  relays: DhtRelayInfo[]
  count: number
}

/** Params for `dht.findValue`. */
export interface DhtFindValueParams {
  /** Base64-encoded key ID. */
  key_id: string
  name: string
  index: number
}

/** Result of `dht.findValue`. */
export interface DhtFindValueResult {
  /** Base64-encoded value bytes. */
  data: string
  ttl: number
}

// =============================================================================
// Lite (liteserver)
// =============================================================================

/** Result of `lite.getMasterchainInfo` (no params). */
export interface LiteGetMasterchainInfoResult {
  seqno: number
  workchain: number
  /** Hex-encoded shard ID. */
  shard: string
  /** Hex-encoded root hash. */
  root_hash: string
  /** Hex-encoded file hash. */
  file_hash: string
}

/** Params for `lite.getAccountState`. */
export interface LiteGetAccountStateParams {
  address: string
}

/** Result of `lite.getAccountState`. */
export interface LiteGetAccountStateResult {
  /** One of "active", "frozen", "uninit". */
  status: string
  /** Balance in nanotons. */
  balance: string
  last_tx_lt: string
  /** Hex-encoded last transaction hash. */
  last_tx_hash: string
  has_code: boolean
  has_data: boolean
  /** Base64 BOC of account code (present only when has_code is true). */
  code?: string
  /** Base64 BOC of account data (present only when has_data is true). */
  data?: string
}

/** Params for `lite.runMethod`. */
export interface LiteRunMethodParams {
  address: string
  method: string
  params: unknown[]
}

/** Result of `lite.runMethod`. */
export interface LiteRunMethodResult {
  exit_code: number
  /** TVM stack items serialized as strings (big ints) or base64 (cells). */
  stack: unknown[]
}

/** Params for `lite.sendMessage` and `lite.sendMessageWait`. */
export interface LiteSendMessageParams {
  /** Base64-encoded external message BOC. */
  boc: string
}

/** Result of `lite.sendMessage` and `lite.sendMessageWait`. */
export interface LiteSendMessageResult {
  /** Hex-encoded message cell hash. */
  hash: string
  status: number
}

/** Params for `lite.getTransactions`. */
export interface LiteGetTransactionsParams {
  address: string
  limit?: number
  /** Optional LT for pagination (decimal string). */
  last_lt?: string
  /** Optional hex-encoded hash for pagination. */
  last_hash?: string
}

/** A message inside a transaction (matches Go `serializeMessage`). */
export interface LiteTransactionMessage {
  /** Sender address (empty string if external). */
  source: string
  /** Destination address (empty string if external-out). */
  destination: string
  /** Amount in nanotons ("0" for external messages). */
  value: string
  /** Base64-encoded body BOC (empty string if no payload). */
  body: string
}

/** A single transaction (matches Go `serializeTransaction`). */
export interface LiteTransaction {
  /** Hex-encoded transaction hash. */
  hash: string
  /** Logical time (decimal string). */
  lt: string
  /** Unix timestamp. */
  now: number
  /** Total fees in nanotons. */
  total_fees: string
  /** Previous transaction LT (decimal string). */
  prev_tx_lt: string
  /** Hex-encoded previous transaction hash. */
  prev_tx_hash: string
  in_msg?: LiteTransactionMessage
  out_msgs: LiteTransactionMessage[]
}

/** Result of `lite.getTransactions`. */
export interface LiteGetTransactionsResult {
  transactions: LiteTransaction[]
}

/** Params for `lite.getTransaction`. */
export interface LiteGetTransactionParams {
  address: string
  /** Logical time (decimal string). */
  lt: string
}
// Result is LiteTransaction directly.

/** Params for `lite.findTxByInMsgHash`. */
export interface LiteFindTxByInMsgHashParams {
  address: string
  /** Hex-encoded inbound message hash. */
  msg_hash: string
}
// Result is LiteTransaction directly.

/** Params for `lite.findTxByOutMsgHash`. */
export interface LiteFindTxByOutMsgHashParams {
  address: string
  /** Hex-encoded outbound message hash. */
  msg_hash: string
}
// Result is LiteTransaction directly.

/** Result of `lite.getTime` (no params). */
export interface LiteGetTimeResult {
  time: number
}

/** Params for `lite.lookupBlock`. */
export interface LiteLookupBlockParams {
  workchain: number
  /** Hex-encoded shard ID. */
  shard: string
  seqno: number
}

/** Result of `lite.lookupBlock`. */
export interface LiteLookupBlockResult {
  workchain: number
  shard: string
  seqno: number
  root_hash: string
  file_hash: string
}

/** Params for `lite.getBlockTransactions`. */
export interface LiteGetBlockTransactionsParams {
  workchain: number
  shard: string
  seqno: number
  count?: number
}

/** A short transaction reference from a block. */
export interface LiteBlockTransaction {
  /** Hex-encoded account address. */
  account: string
  lt: string
  /** Hex-encoded transaction hash. */
  hash: string
}

/** Result of `lite.getBlockTransactions`. */
export interface LiteGetBlockTransactionsResult {
  transactions: LiteBlockTransaction[]
  incomplete: boolean
}

/** Result of `lite.getShards` (no params). */
export interface LiteShardInfo {
  workchain: number
  shard: string
  seqno: number
}

/** Result of `lite.getShards`. */
export interface LiteGetShardsResult {
  shards: LiteShardInfo[]
}

/** Params for `lite.getBlockchainConfig`. */
export interface LiteGetBlockchainConfigParams {
  params?: number[]
}

/** Result of `lite.getBlockchainConfig`. */
export interface LiteGetBlockchainConfigResult {
  /** Key is param ID (decimal string), value is base64 BOC or null. */
  params: Record<string, string | null>
}

/** Params for `lite.getBlockData`. */
export interface LiteGetBlockDataParams {
  workchain: number
  shard: string
  seqno: number
}

/** Result of `lite.getBlockData`. */
export interface LiteGetBlockDataResult {
  /** Base64-encoded block BOC. */
  boc: string
}

/** Params for `lite.getBlockHeader`. */
export interface LiteGetBlockHeaderParams {
  workchain: number
  shard: string
  seqno: number
}

/** Result of `lite.getBlockHeader`. */
export interface LiteGetBlockHeaderResult {
  workchain: number
  shard: string
  seqno: number
  root_hash: string
  file_hash: string
  /** Base64-encoded header proof BOC. */
  header_boc: string
}

/** Params for `lite.getLibraries`. */
export interface LiteGetLibrariesParams {
  /** Hex-encoded library cell hashes. */
  hashes: string[]
}

/** A single library entry. */
export interface LiteLibraryEntry {
  /** Hex-encoded hash. */
  hash: string
  /** Base64-encoded BOC. */
  boc: string
}

/** Result of `lite.getLibraries`. */
export interface LiteGetLibrariesResult {
  /** Array of library entries (null for missing hashes). */
  libraries: (LiteLibraryEntry | null)[]
}

/** Params for `lite.sendAndWatch`. */
export interface LiteSendAndWatchParams {
  /** Base64-encoded external message BOC. */
  boc: string
}

/** Confirmation result of `lite.sendAndWatch`. */
export interface LiteSendAndWatchResult {
  watching: boolean
  subscription_id: string
  /** Hex-encoded message cell hash. */
  msg_hash: string
}

// =============================================================================
// Subscribe
// =============================================================================

/** Params for `subscribe.transactions`. */
export interface SubscribeTransactionsParams {
  address: string
  last_lt?: string
  /** Optional list of opcodes to filter incoming transactions. */
  operations?: number[]
}

/** Confirmation of `subscribe.transactions`. */
export interface SubscribeTransactionsConfirmation {
  subscribed: boolean
  address: string
  subscription_id: string
}
// Push event: "transaction" with data: LiteTransaction

/** Confirmation of `subscribe.blocks` (no params). */
export interface SubscribeBlocksConfirmation {
  subscribed: boolean
  start_seqno: number
  subscription_id: string
}

/** Push data for the "block" event. */
export interface SubscribeBlockEvent {
  seqno: number
  workchain: number
  shard: string
  root_hash: string
  file_hash: string
  shards: LiteShardInfo[]
}

/** Params for `subscribe.accountState`. */
export interface SubscribeAccountStateParams {
  address: string
}

/** Confirmation of `subscribe.accountState`. */
export interface SubscribeAccountStateConfirmation {
  subscribed: boolean
  address: string
  balance: string
  last_tx_lt: string
  subscription_id: string
}

/** Push data for the "account_state" event. */
export interface SubscribeAccountStateEvent {
  address: string
  balance: string
  status: string
  last_tx_lt: string
  last_tx_hash: string
  block_seqno: number
}

/** Confirmation of `subscribe.newTransactions` (no params). */
export interface SubscribeNewTransactionsConfirmation {
  subscribed: boolean
  start_seqno: number
  subscription_id: string
}

/** Push data for the "new_transaction" event. */
export interface SubscribeNewTransactionEvent {
  /** Hex-encoded account address. */
  account: string
  lt: string
  hash: string
  block_workchain: number
  block_shard: string
  block_seqno: number
}

/** Params for `subscribe.configChanges`. */
export interface SubscribeConfigChangesParams {
  /** List of blockchain config param IDs to watch. */
  params: number[]
}

/** Confirmation of `subscribe.configChanges`. */
export interface SubscribeConfigChangesConfirmation {
  subscribed: boolean
  start_seqno: number
  subscription_id: string
}

/** Push data for the "config_changed" event. */
export interface SubscribeConfigChangedEvent {
  param_id: number
  block_seqno: number
  /** Base64-encoded BOC of the old value. */
  old_value: string
  /** Base64-encoded BOC of the new value. */
  new_value: string
}

/** A single account entry for `subscribe.multiAccount`. */
export interface MultiAccountEntry {
  address: string
  last_lt?: string
  operations?: number[]
}

/** Params for `subscribe.multiAccount`. */
export interface SubscribeMultiAccountParams {
  accounts: MultiAccountEntry[]
}

/** Confirmation of `subscribe.multiAccount`. */
export interface SubscribeMultiAccountConfirmation {
  subscribed: boolean
  account_count: number
  subscription_id: string
}
// Push event: "transaction" with data: LiteTransaction & { address: string }

/** Params for `subscribe.trace`. */
export interface SubscribeTraceParams {
  address: string
  last_lt?: string
  /** Max depth of internal message chains (1-10, default 3). */
  max_depth?: number
  /** Per-message timeout in seconds (1-120, default 10). */
  msg_timeout_sec?: number
}

/** Confirmation of `subscribe.trace`. */
export interface SubscribeTraceConfirmation {
  subscribed: boolean
  address: string
  subscription_id: string
}

/** Push data for the "trace_started" event. */
export interface TraceStartedEvent {
  trace_id: string
  root_tx: LiteTransaction
  subscription_id: string
}

/** Push data for the "trace_tx" event. */
export interface TraceTxEvent {
  trace_id: string
  transaction: LiteTransaction & { address: string }
  depth: number
  address: string
}

/** Push data for the "trace_complete" event. */
export interface TraceCompleteEvent {
  trace_id: string
  total_txs: number
  max_depth_reached: number
  timed_out_count: number
}

/** Push data for the "trace_timeout" event. */
export interface TraceTimeoutEvent {
  trace_id: string
  address: string
  body_hash: string
  depth: number
}

/** Params for `subscribe.unsubscribe`. */
export interface SubscribeUnsubscribeParams {
  subscription_id: string
}

/** Result of `subscribe.unsubscribe`. */
export interface SubscribeUnsubscribeResult {
  unsubscribed: boolean
  subscription_id: string
}

/** Push data for the "tx_confirmed" event (from `lite.sendAndWatch`). */
export interface TxConfirmedEvent {
  msg_hash: string
  transaction: LiteTransaction
  block: { seqno: number; workchain: number; shard: string }
}

/** Push data for the "tx_timeout" event (from `lite.sendAndWatch`). */
export interface TxTimeoutEvent {
  msg_hash: string
  reason: string
}

// =============================================================================
// Jetton
// =============================================================================

/** Params for `jetton.getData`. */
export interface JettonGetDataParams {
  address: string
}

/** Result of `jetton.getData`. */
export interface JettonGetDataResult {
  total_supply: string
  mintable: boolean
  admin: string | null
  /** TEP-64 content from `serializeJettonContent`. */
  content: JettonTepContent
}

/** Params for `jetton.getWalletAddress`. */
export interface JettonGetWalletAddressParams {
  jetton_master: string
  owner: string
}

/** Result of `jetton.getWalletAddress`. */
export interface JettonGetWalletAddressResult {
  wallet_address: string
}

/** Params for `jetton.getBalance`. */
export interface JettonGetBalanceParams {
  jetton_wallet: string
}

/** Result of `jetton.getBalance`. */
export interface JettonGetBalanceResult {
  balance: string
  owner: string | null
  jetton_master: string | null
}

// =============================================================================
// NFT
// =============================================================================

/** Params for `nft.getData`. */
export interface NftGetDataParams {
  address: string
}

/** Result of `nft.getData`. */
export interface NftGetDataResult {
  initialized: boolean
  index: string
  collection: string | null
  owner: string | null
  /** TEP-64 content from `serializeContent`. */
  content: NftTepContent
}

/** Params for `nft.getCollectionData`. */
export interface NftGetCollectionDataParams {
  address: string
}

/** Result of `nft.getCollectionData`. */
export interface NftGetCollectionDataResult {
  next_item_index: string
  owner: string | null
  /** TEP-64 content from `serializeContent`. */
  content: NftTepContent
}

/** Params for `nft.getAddressByIndex`. */
export interface NftGetAddressByIndexParams {
  collection: string
  /** Decimal integer string. */
  index: string
}

/** Result of `nft.getAddressByIndex`. */
export interface NftGetAddressByIndexResult {
  address: string
}

/** Params for `nft.getRoyaltyParams`. */
export interface NftGetRoyaltyParamsParams {
  collection: string
}

/** Result of `nft.getRoyaltyParams`. */
export interface NftGetRoyaltyParamsResult {
  factor: number
  base: number
  address: string | null
}

/** Params for `nft.getContent`. */
export interface NftGetContentParams {
  collection: string
  /** Decimal integer string. */
  index: string
  /** Base64-encoded individual content BOC. */
  individual_content: string
}

/** Result of `nft.getContent`. */
export interface NftGetContentResult {
  content: NftTepContent
}

// =============================================================================
// Wallet
// =============================================================================

/** Params for `wallet.getSeqno`. */
export interface WalletGetSeqnoParams {
  address: string
}

/** Result of `wallet.getSeqno`. */
export interface WalletGetSeqnoResult {
  seqno: number
}

/** Params for `wallet.getPublicKey`. */
export interface WalletGetPublicKeyParams {
  address: string
}

/** Result of `wallet.getPublicKey`. */
export interface WalletGetPublicKeyResult {
  /** Base64-encoded ed25519 public key. */
  public_key: string
}

// =============================================================================
// SBT (Soulbound Token)
// =============================================================================

/** Params for `sbt.getAuthorityAddress`. */
export interface SbtGetAuthorityAddressParams {
  address: string
}

/** Result of `sbt.getAuthorityAddress`. */
export interface SbtGetAuthorityAddressResult {
  authority: string | null
}

/** Params for `sbt.getRevokedTime`. */
export interface SbtGetRevokedTimeParams {
  address: string
}

/** Result of `sbt.getRevokedTime`. */
export interface SbtGetRevokedTimeResult {
  /** Unix timestamp; 0 means not revoked. */
  revoked_time: number
}

// =============================================================================
// Payment Channel
// =============================================================================

/** Params for `payment.getChannelState`. */
export interface PaymentGetChannelStateParams {
  address: string
}

/** Semi-channel state within a quarantine record. */
export interface PaymentSemiChannelState {
  seqno: number
  /** Nanotons sent. */
  sent: string
}

/** Quarantine info for a payment channel (null when no quarantine is active). */
export interface PaymentQuarantine {
  quarantine_starts: number
  state_committed_by_a: boolean
  state_challenged: boolean
  state_a: PaymentSemiChannelState
  state_b: PaymentSemiChannelState
}

/** Closing configuration of a payment channel. */
export interface PaymentClosingConfig {
  quarantine_duration: number
  conditional_close_duration: number
  /** Misbehavior fine in nanotons. */
  misbehavior_fine: string
}

/** Result of `payment.getChannelState`. */
export interface PaymentGetChannelStateResult {
  status: number
  initialized: boolean
  /** Balance of party A in nanotons. */
  balance_a: string
  /** Balance of party B in nanotons. */
  balance_b: string
  /** Base64-encoded ed25519 public key of party A. */
  key_a: string
  /** Base64-encoded ed25519 public key of party B. */
  key_b: string
  /** Hex-encoded channel ID. */
  channel_id: string
  committed_seqno_a: number
  committed_seqno_b: number
  quarantine: PaymentQuarantine | null
  dest_a: string | null
  dest_b: string | null
  /** Excess fee in nanotons. */
  excess_fee: string
  closing_config: PaymentClosingConfig
}

// =============================================================================
// DNS
// =============================================================================

/** Params for `dns.resolve`. */
export interface DnsResolveParams {
  domain: string
}

/** Result of `dns.resolve`. */
export interface DnsResolveResult {
  wallet: string | null
  /** Hex-encoded ADNL address of the site record. */
  site_adnl: string | null
  has_storage: boolean
  owner: string | null
  nft_address: string | null
  collection: string | null
  editor: string | null
  initialized: boolean
  /** Unix timestamp or null if unknown. */
  expiring_at: number | null
  /** Map of sha256(name) hex keys to text values (category 0x1eda). */
  text_records?: Record<string, string>
}

// =============================================================================
// ADNL
// =============================================================================

/** Params for `adnl.connect`. */
export interface AdnlConnectParams {
  address: string
  /** Base64-encoded ed25519 public key. */
  key: string
}

/** Result of `adnl.connect` and `adnl.connectByADNL`. */
export interface AdnlConnectResult {
  connected: boolean
  /** Base64-encoded peer ID. */
  peer_id: string
  remote_addr: string
}

/** Params for `adnl.connectByADNL`. */
export interface AdnlConnectByAdnlParams {
  /** Base64-encoded ADNL ID. */
  adnl_id: string
}

/** Params for `adnl.sendMessage`. */
export interface AdnlSendMessageParams {
  /** Base64-encoded peer ID. */
  peer_id: string
  /** Base64-encoded message data. */
  data: string
}

/** Result of `adnl.sendMessage`. */
export interface AdnlSendMessageResult {
  sent: boolean
}

/** Params for `adnl.ping`. */
export interface AdnlPingParams {
  /** Base64-encoded peer ID. */
  peer_id: string
}

/** Result of `adnl.ping`. */
export interface AdnlPingResult {
  latency_ms: number
}

/** Params for `adnl.disconnect`. */
export interface AdnlDisconnectParams {
  /** Base64-encoded peer ID. */
  peer_id: string
}

/** Result of `adnl.disconnect`. */
export interface AdnlDisconnectResult {
  disconnected: boolean
}

/** Result of `adnl.peers` (no params). */
export interface AdnlPeerInfo {
  /** Base64-encoded peer ID. */
  id: string
  addr: string
}

/** Result of `adnl.peers`. */
export interface AdnlPeersResult {
  peers: AdnlPeerInfo[]
}

/** Params for `adnl.query`. */
export interface AdnlQueryParams {
  /** Base64-encoded peer ID. */
  peer_id: string
  /** Base64-encoded TL-serialized request. */
  data: string
  /** Optional timeout in seconds (1-60, default 15). */
  timeout?: number
}

/** Result of `adnl.query`. */
export interface AdnlQueryResult {
  /** Base64-encoded TL-serialized response. */
  data: string
}

/** Params for `adnl.setQueryHandler`. */
export interface AdnlSetQueryHandlerParams {
  /** Base64-encoded peer ID. */
  peer_id: string
}

/** Result of `adnl.setQueryHandler`. */
export interface AdnlSetQueryHandlerResult {
  enabled: boolean
}

/** Params for `adnl.answer`. */
export interface AdnlAnswerParams {
  /** Hex-encoded query ID. */
  query_id: string
  /** Base64-encoded TL-serialized response. */
  data: string
}

/** Result of `adnl.answer`. */
export interface AdnlAnswerResult {
  answered: boolean
}

/** Push data for the "adnl.message" event. */
export interface AdnlMessageEvent {
  /** Base64-encoded peer ID. */
  from: string
  /** Base64-encoded message data. */
  message: string
}

/** Push data for the "adnl.disconnected" event. */
export interface AdnlDisconnectedEvent {
  /** Base64-encoded peer ID. */
  peer: string
}

/** Push data for the "adnl.incomingConnection" event. */
export interface AdnlIncomingConnectionEvent {
  /** Base64-encoded peer ID. */
  peer_id: string
  remote_addr: string
}

/** Push data for the "adnl.queryReceived" event. */
export interface AdnlQueryReceivedEvent {
  /** Base64-encoded peer ID. */
  peer_id: string
  /** Hex-encoded query ID. */
  query_id: string
  /** Base64-encoded query data. */
  data: string
}

// =============================================================================
// Overlay (pubsub P2P)
// =============================================================================

/** Params for `overlay.join`. */
export interface OverlayJoinParams {
  /** Base64-encoded overlay ID. */
  overlay_id: string
  /** Base64-encoded ADNL peer ID. */
  peer_id: string
}

/** Result of `overlay.join`. */
export interface OverlayJoinResult {
  joined: boolean
  overlay_id: string
}

/** Params for `overlay.leave`. */
export interface OverlayLeaveParams {
  overlay_id: string
}

/** Result of `overlay.leave`. */
export interface OverlayLeaveResult {
  left: boolean
}

/** Params for `overlay.getPeers`. */
export interface OverlayGetPeersParams {
  overlay_id: string
}

/** A single peer inside an overlay. */
export interface OverlayPeerInfo {
  /** Base64-encoded ed25519 public key. */
  id: string
  /** Base64-encoded overlay ID. */
  overlay: string
}

/** Result of `overlay.getPeers`. */
export interface OverlayGetPeersResult {
  peers: OverlayPeerInfo[]
}

/** Params for `overlay.sendMessage`. */
export interface OverlaySendMessageParams {
  overlay_id: string
  /** Base64-encoded message data. */
  data: string
}

/** Result of `overlay.sendMessage`. */
export interface OverlaySendMessageResult {
  sent: boolean
}

/** Params for `overlay.query`. */
export interface OverlayQueryParams {
  overlay_id: string
  /** Base64-encoded TL-serialized request. */
  data: string
  /** Optional timeout in seconds (1-60, default 15). */
  timeout?: number
}

/** Result of `overlay.query`. */
export interface OverlayQueryResult {
  /** Base64-encoded TL-serialized response. */
  data: string
}

/** Params for `overlay.setQueryHandler`. */
export interface OverlaySetQueryHandlerParams {
  overlay_id: string
  /** Base64-encoded ADNL peer ID that owns this overlay. */
  peer_id: string
}

/** Result of `overlay.setQueryHandler`. */
export interface OverlaySetQueryHandlerResult {
  enabled: boolean
}

/** Params for `overlay.answer`. */
export interface OverlayAnswerParams {
  /** Hex-encoded query ID. */
  query_id: string
  /** Base64-encoded TL-serialized response. */
  data: string
}

/** Result of `overlay.answer`. */
export interface OverlayAnswerResult {
  answered: boolean
}

/** Push data for the "overlay.broadcast" event. */
export interface OverlayBroadcastEvent {
  overlay_id: string
  /** Base64-encoded broadcast data. */
  message: string
  trusted: boolean
}

/** Push data for the "overlay.message" event. */
export interface OverlayMessageEvent {
  overlay_id: string
  /** Base64-encoded message data. */
  message: string
}

/** Push data for the "overlay.queryReceived" event. */
export interface OverlayQueryReceivedEvent {
  overlay_id: string
  /** Hex-encoded query ID. */
  query_id: string
  /** Base64-encoded query data. */
  data: string
}

// =============================================================================
// Network
// =============================================================================

/** Result of `network.info` (no params). */
export interface NetworkInfoResult {
  dht_connected: boolean
  ws_clients: number
}

// =============================================================================
// Method registry — maps every method name to {params, result} for type safety.
// 61 entries.
// =============================================================================

export interface MethodMap {
  // DHT (4)
  'dht.findAddresses': { params: DhtFindAddressesParams; result: DhtFindAddressesResult }
  'dht.findOverlayNodes': { params: DhtFindOverlayNodesParams; result: DhtFindOverlayNodesResult }
  'dht.findTunnelNodes': { params: undefined; result: DhtFindTunnelNodesResult }
  'dht.findValue': { params: DhtFindValueParams; result: DhtFindValueResult }

  // Lite (18)
  'lite.getMasterchainInfo': { params: undefined; result: LiteGetMasterchainInfoResult }
  'lite.getAccountState': { params: LiteGetAccountStateParams; result: LiteGetAccountStateResult }
  'lite.runMethod': { params: LiteRunMethodParams; result: LiteRunMethodResult }
  'lite.sendMessage': { params: LiteSendMessageParams; result: LiteSendMessageResult }
  'lite.sendMessageWait': { params: LiteSendMessageParams; result: LiteSendMessageResult }
  'lite.getTransactions': { params: LiteGetTransactionsParams; result: LiteGetTransactionsResult }
  'lite.getTransaction': { params: LiteGetTransactionParams; result: LiteTransaction }
  'lite.findTxByInMsgHash': { params: LiteFindTxByInMsgHashParams; result: LiteTransaction }
  'lite.findTxByOutMsgHash': { params: LiteFindTxByOutMsgHashParams; result: LiteTransaction }
  'lite.getTime': { params: undefined; result: LiteGetTimeResult }
  'lite.lookupBlock': { params: LiteLookupBlockParams; result: LiteLookupBlockResult }
  'lite.getBlockTransactions': { params: LiteGetBlockTransactionsParams; result: LiteGetBlockTransactionsResult }
  'lite.getShards': { params: undefined; result: LiteGetShardsResult }
  'lite.getBlockchainConfig': { params: LiteGetBlockchainConfigParams; result: LiteGetBlockchainConfigResult }
  'lite.sendAndWatch': { params: LiteSendAndWatchParams; result: LiteSendAndWatchResult }
  'lite.getBlockData': { params: LiteGetBlockDataParams; result: LiteGetBlockDataResult }
  'lite.getBlockHeader': { params: LiteGetBlockHeaderParams; result: LiteGetBlockHeaderResult }
  'lite.getLibraries': { params: LiteGetLibrariesParams; result: LiteGetLibrariesResult }

  // Subscribe (8)
  'subscribe.transactions': { params: SubscribeTransactionsParams; result: SubscribeTransactionsConfirmation }
  'subscribe.blocks': { params: undefined; result: SubscribeBlocksConfirmation }
  'subscribe.accountState': { params: SubscribeAccountStateParams; result: SubscribeAccountStateConfirmation }
  'subscribe.newTransactions': { params: undefined; result: SubscribeNewTransactionsConfirmation }
  'subscribe.configChanges': { params: SubscribeConfigChangesParams; result: SubscribeConfigChangesConfirmation }
  'subscribe.multiAccount': { params: SubscribeMultiAccountParams; result: SubscribeMultiAccountConfirmation }
  'subscribe.trace': { params: SubscribeTraceParams; result: SubscribeTraceConfirmation }
  'subscribe.unsubscribe': { params: SubscribeUnsubscribeParams; result: SubscribeUnsubscribeResult }

  // Jetton (3)
  'jetton.getData': { params: JettonGetDataParams; result: JettonGetDataResult }
  'jetton.getWalletAddress': { params: JettonGetWalletAddressParams; result: JettonGetWalletAddressResult }
  'jetton.getBalance': { params: JettonGetBalanceParams; result: JettonGetBalanceResult }

  // NFT (5)
  'nft.getData': { params: NftGetDataParams; result: NftGetDataResult }
  'nft.getCollectionData': { params: NftGetCollectionDataParams; result: NftGetCollectionDataResult }
  'nft.getAddressByIndex': { params: NftGetAddressByIndexParams; result: NftGetAddressByIndexResult }
  'nft.getRoyaltyParams': { params: NftGetRoyaltyParamsParams; result: NftGetRoyaltyParamsResult }
  'nft.getContent': { params: NftGetContentParams; result: NftGetContentResult }

  // Wallet (2)
  'wallet.getSeqno': { params: WalletGetSeqnoParams; result: WalletGetSeqnoResult }
  'wallet.getPublicKey': { params: WalletGetPublicKeyParams; result: WalletGetPublicKeyResult }

  // SBT (2)
  'sbt.getAuthorityAddress': { params: SbtGetAuthorityAddressParams; result: SbtGetAuthorityAddressResult }
  'sbt.getRevokedTime': { params: SbtGetRevokedTimeParams; result: SbtGetRevokedTimeResult }

  // Payment (1)
  'payment.getChannelState': { params: PaymentGetChannelStateParams; result: PaymentGetChannelStateResult }

  // DNS (1)
  'dns.resolve': { params: DnsResolveParams; result: DnsResolveResult }

  // ADNL (9)
  'adnl.connect': { params: AdnlConnectParams; result: AdnlConnectResult }
  'adnl.connectByADNL': { params: AdnlConnectByAdnlParams; result: AdnlConnectResult }
  'adnl.sendMessage': { params: AdnlSendMessageParams; result: AdnlSendMessageResult }
  'adnl.ping': { params: AdnlPingParams; result: AdnlPingResult }
  'adnl.disconnect': { params: AdnlDisconnectParams; result: AdnlDisconnectResult }
  'adnl.peers': { params: undefined; result: AdnlPeersResult }
  'adnl.query': { params: AdnlQueryParams; result: AdnlQueryResult }
  'adnl.setQueryHandler': { params: AdnlSetQueryHandlerParams; result: AdnlSetQueryHandlerResult }
  'adnl.answer': { params: AdnlAnswerParams; result: AdnlAnswerResult }

  // Overlay (7)
  'overlay.join': { params: OverlayJoinParams; result: OverlayJoinResult }
  'overlay.leave': { params: OverlayLeaveParams; result: OverlayLeaveResult }
  'overlay.getPeers': { params: OverlayGetPeersParams; result: OverlayGetPeersResult }
  'overlay.sendMessage': { params: OverlaySendMessageParams; result: OverlaySendMessageResult }
  'overlay.query': { params: OverlayQueryParams; result: OverlayQueryResult }
  'overlay.setQueryHandler': { params: OverlaySetQueryHandlerParams; result: OverlaySetQueryHandlerResult }
  'overlay.answer': { params: OverlayAnswerParams; result: OverlayAnswerResult }

  // Network (1)
  'network.info': { params: undefined; result: NetworkInfoResult }
}

// =============================================================================
// Subscription event map — maps every push event name to its data type.
// =============================================================================

export interface SubscriptionEventMap {
  // Subscription events
  'transaction': LiteTransaction
  'block': SubscribeBlockEvent
  'account_state': SubscribeAccountStateEvent
  'new_transaction': SubscribeNewTransactionEvent
  'config_changed': SubscribeConfigChangedEvent

  // Trace events
  'trace_started': TraceStartedEvent
  'trace_tx': TraceTxEvent
  'trace_complete': TraceCompleteEvent
  'trace_timeout': TraceTimeoutEvent

  // SendAndWatch events
  'tx_confirmed': TxConfirmedEvent
  'tx_timeout': TxTimeoutEvent

  // ADNL events
  'adnl.message': AdnlMessageEvent
  'adnl.disconnected': AdnlDisconnectedEvent
  'adnl.incomingConnection': AdnlIncomingConnectionEvent
  'adnl.queryReceived': AdnlQueryReceivedEvent

  // Overlay events
  'overlay.broadcast': OverlayBroadcastEvent
  'overlay.message': OverlayMessageEvent
  'overlay.queryReceived': OverlayQueryReceivedEvent
}
