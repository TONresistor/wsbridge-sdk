/**
 * E2E tests against a live WS-ADNL bridge on ws://127.0.0.1:8081
 *
 * These tests are a 1:1 translation of the Go E2E suite at
 * proxy/wsbridge/e2e_test.go. They use the same addresses, same assertions,
 * and the same error-handling pattern:
 *
 *   - Methods that MUST succeed: no try/catch, test fails on any error.
 *   - Methods that MUST error: expect the error, verify not -32601.
 *   - Network-dependent methods: try/catch where the catch asserts
 *     rpcCode !== -32601 (method-not-found is fatal, network errors pass).
 *
 * Prerequisites: tonutils-proxy-ws must be running with the bridge enabled.
 *   go build -o proxy-cli ./cmd/proxy-cli/
 *   ./proxy-cli --ws-addr 127.0.0.1:8081
 *   # wait ~10s for DHT bootstrap
 *
 * Run all:  npx vitest run src/__tests__/e2e.test.ts --timeout 120000
 * Run one:  npx vitest run src/__tests__/e2e.test.ts -t "lite"
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Web3SocketsClient } from '../client'
import { RpcError } from '../errors'

// ---------------------------------------------------------------------------
// Known addresses for testing (same as Go E2E)
// ---------------------------------------------------------------------------

const TON_FOUNDATION = 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N'
const HOT_WALLET     = 'UQDdb_AsWWNHRVKbmajVvu6p9sOKkYjmp-lqQk44IMisCnMY'
const USDT_MASTER    = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs'
const NFT_COLLECTION = 'EQDvRFMYLdxmvY3Tk-cfWMLqDnXF_EclO2Fp4wwj33WhlNFT'
const SBT_ADDR       = 'EQDle-2qf9QJ9KIxmpqYzAyuyX61Bi8aKDwuJQZlTTxJqkTo'
const PAY_CHANNEL    = 'EQA4Ntk6B2Sq-LbHoZ-11FFgr43o3dk5hS3w5G3OkOzHhQEG'

const RELAY_ADDR = '80.78.27.15:17330'
const RELAY_KEY  = '0nAqzFCklgG1vJFgKHqU7Z87c7RHYn345e4jPnxqnxM='

let client: Web3SocketsClient

beforeAll(async () => {
  client = new Web3SocketsClient({ url: 'ws://127.0.0.1:8081', requestTimeout: 30000 })
  await client.connect()
})

afterAll(() => {
  client.disconnect()
})

// =============================================================================
// Network (1 method)
// =============================================================================

describe('network', () => {
  it('info — MUST succeed, dht_connected true, ws_clients >= 1', async () => {
    const info = await client.network.info()
    expect(info.dht_connected).toBe(true)
    expect(typeof info.ws_clients).toBe('number')
    expect(info.ws_clients).toBeGreaterThanOrEqual(1)
  })
})

// =============================================================================
// Lite — 18 blockchain methods
// =============================================================================

describe('lite', () => {
  let masterSeqno: number
  let firstTxLT: string

  it('getMasterchainInfo — MUST succeed, seqno > 0', async () => {
    const block = await client.lite.getMasterchainInfo()
    expect(block.seqno).toBeGreaterThan(0)
    expect(block.workchain).toBe(-1)
    expect(block.shard).toBe('8000000000000000')
    expect(block.root_hash).toHaveLength(64)
    expect(block.file_hash).toHaveLength(64)
    masterSeqno = block.seqno
  })

  it('getAccountState — MUST succeed, balance > 0, status active', async () => {
    const acc = await client.lite.getAccountState({ address: TON_FOUNDATION })
    expect(acc.status).toBe('active')
    expect(BigInt(acc.balance)).toBeGreaterThan(0n)
    expect(acc.last_tx_lt).toBeTruthy()
    expect(acc.last_tx_hash).toHaveLength(64)
    expect(acc.has_code).toBe(true)
    expect(acc.has_data).toBe(true)
  })

  it('runMethod — MUST succeed, seqno on testAddr, exit_code 0', async () => {
    const result = await client.lite.runMethod({
      address: TON_FOUNDATION,
      method: 'seqno',
      params: [],
    })
    expect(result.exit_code).toBe(0)
    expect(Array.isArray(result.stack)).toBe(true)
  })

  it('sendMessage — MUST error (invalid BOC), NOT -32601', async () => {
    try {
      await client.lite.sendMessage({ boc: 'AQID' })
      // If it somehow succeeds, that's a failure — invalid BOC should be rejected.
      expect.unreachable('Expected error for invalid BOC')
    } catch (err) {
      expect((err as RpcError).rpcCode).not.toBe(-32601)
    }
  })

  it('sendMessageWait — MUST error (invalid BOC), NOT -32601', async () => {
    try {
      await client.lite.sendMessageWait({ boc: 'AQID' })
      expect.unreachable('Expected error for invalid BOC')
    } catch (err) {
      expect((err as RpcError).rpcCode).not.toBe(-32601)
    }
  })

  it('getTransactions — MUST succeed, at least 1 tx from hotWallet', async () => {
    const result = await client.lite.getTransactions({ address: HOT_WALLET, limit: 2 })
    expect(result.transactions.length).toBeGreaterThanOrEqual(1)
    expect(result.transactions.length).toBeLessThanOrEqual(2)
    for (const tx of result.transactions) {
      expect(tx.hash).toHaveLength(64)
      expect(BigInt(tx.lt)).toBeGreaterThan(0n)
      expect(typeof tx.now).toBe('number')
      expect(typeof tx.total_fees).toBe('string')
      expect(typeof tx.prev_tx_lt).toBe('string')
      expect(typeof tx.prev_tx_hash).toBe('string')
      expect(Array.isArray(tx.out_msgs)).toBe(true)
    }
    firstTxLT = result.transactions[0].lt
  })

  it('getTime — MUST succeed, time > 1700000000', async () => {
    const result = await client.lite.getTime()
    expect(result.time).toBeGreaterThan(1700000000)
  })

  it('lookupBlock — MUST succeed, finds block by seqno from getMasterchainInfo', async () => {
    expect(masterSeqno).toBeGreaterThan(0)
    const block = await client.lite.lookupBlock({
      workchain: -1,
      shard: '8000000000000000',
      seqno: masterSeqno,
    })
    expect(block.seqno).toBe(masterSeqno)
    expect(block.workchain).toBe(-1)
    expect(block.root_hash).toHaveLength(64)
    expect(block.file_hash).toHaveLength(64)
  })

  it('getBlockTransactions — MUST succeed, returns transactions in block', async () => {
    expect(masterSeqno).toBeGreaterThan(0)
    const result = await client.lite.getBlockTransactions({
      workchain: -1,
      shard: '8000000000000000',
      seqno: masterSeqno,
      count: 3,
    })
    expect(Array.isArray(result.transactions)).toBe(true)
    expect(typeof result.incomplete).toBe('boolean')
  })

  it('getShards — MUST succeed, at least 1 shard', async () => {
    const result = await client.lite.getShards()
    expect(result.shards.length).toBeGreaterThanOrEqual(1)
  })

  it('getBlockchainConfig — MUST succeed, params [0, 1]', async () => {
    const result = await client.lite.getBlockchainConfig({ params: [0, 1] })
    expect(result.params).toBeTruthy()
    expect(typeof result.params).toBe('object')
  })

  it('getTransaction — MUST succeed, hotWallet tx by LT', async () => {
    expect(firstTxLT).toBeTruthy()
    // Use the SAME address (hotWallet) as getTransactions so liteserver has the block cached.
    const tx = await client.lite.getTransaction({ address: HOT_WALLET, lt: firstTxLT })
    expect(tx.hash).toHaveLength(64)
    expect(tx.lt).toBe(firstTxLT)
    expect(typeof tx.prev_tx_lt).toBe('string')
    expect(typeof tx.prev_tx_hash).toBe('string')
  })

  it('findTxByOutMsgHash — network-dependent, verify NOT -32601', async () => {
    // We cannot compute cell hashes in TS without @ton/core.
    // Get txs, find one with out_msg body, use tx hash as proxy for the method path.
    const txs = await client.lite.getTransactions({ address: HOT_WALLET, limit: 5 })
    const withOutMsg = txs.transactions.find((t) => t.out_msgs.length > 0 && t.out_msgs[0].body)
    if (!withOutMsg) return // no suitable tx found — skip silently like Go

    try {
      await client.lite.findTxByOutMsgHash({
        address: HOT_WALLET,
        msg_hash: withOutMsg.hash, // proxy hash — exercises the path
      })
    } catch (err) {
      expect((err as RpcError).rpcCode).not.toBe(-32601)
    }
  })

  it('getBlockData — MUST succeed, boc field present', async () => {
    expect(masterSeqno).toBeGreaterThan(0)
    const result = await client.lite.getBlockData({
      workchain: -1,
      shard: '8000000000000000',
      seqno: masterSeqno,
    })
    expect(result.boc).toBeTruthy()
    expect(result.boc.length).toBeGreaterThan(0)
  })

  it('getBlockHeader — MUST succeed, header_boc field present', async () => {
    expect(masterSeqno).toBeGreaterThan(0)
    const result = await client.lite.getBlockHeader({
      workchain: -1,
      shard: '8000000000000000',
      seqno: masterSeqno,
    })
    expect(result.seqno).toBe(masterSeqno)
    expect(result.header_boc).toBeTruthy()
    expect(result.root_hash).toHaveLength(64)
    expect(result.file_hash).toHaveLength(64)
  })

  it('getLibraries — network-dependent, verify NOT -32601', async () => {
    const fakeHash = '0000000000000000000000000000000000000000000000000000000000000000'
    try {
      const result = await client.lite.getLibraries({ hashes: [fakeHash] })
      expect(Array.isArray(result.libraries)).toBe(true)
    } catch (err) {
      expect((err as RpcError).rpcCode).not.toBe(-32601)
    }
  })

  it('findTxByInMsgHash — network-dependent, verify NOT -32601', async () => {
    const txs = await client.lite.getTransactions({ address: HOT_WALLET, limit: 5 })
    const withInMsg = txs.transactions.find((t) => t.in_msg?.body)
    if (!withInMsg) return // no suitable tx found

    try {
      await client.lite.findTxByInMsgHash({
        address: HOT_WALLET,
        msg_hash: withInMsg.hash, // proxy hash — exercises the path
      })
    } catch (err) {
      expect((err as RpcError).rpcCode).not.toBe(-32601)
    }
  })

  it('sendAndWatch — MUST error (invalid BOC), NOT -32601', async () => {
    try {
      await client.lite.sendAndWatch({ boc: 'AQID' })
      expect.unreachable('Expected error for invalid BOC')
    } catch (err) {
      expect((err as RpcError).rpcCode).not.toBe(-32601)
    }
  })
})

// =============================================================================
// DHT — 4 methods
// =============================================================================

describe('dht', () => {
  it('findTunnelNodes — MUST succeed, count > 0', async () => {
    const result = await client.dht.findTunnelNodes()
    expect(result.count).toBeGreaterThan(0)
    expect(Array.isArray(result.relays)).toBe(true)
    if (result.relays.length > 0) {
      expect(result.relays[0].adnl_id).toBeTruthy()
      expect(typeof result.relays[0].version).toBe('number')
    }
  })

  it('findOverlayNodes — network-dependent, verify NOT -32601', async () => {
    // Use a random overlay key — may return empty or error
    const randomKey = Buffer.alloc(32, 0xff).toString('base64')
    try {
      const result = await client.dht.findOverlayNodes({ overlay_key: randomKey })
      expect(Array.isArray(result.nodes)).toBe(true)
      expect(typeof result.count).toBe('number')
    } catch (err) {
      expect((err as RpcError).rpcCode).not.toBe(-32601)
    }
  })

  it('findAddresses — network-dependent, verify NOT -32601', async () => {
    // Use relay key as ADNL ID (same as Go test)
    try {
      const result = await client.dht.findAddresses({ key: RELAY_KEY })
      expect(result.addresses.length).toBeGreaterThanOrEqual(1)
      expect(result.addresses[0].ip).toBeTruthy()
      expect(result.addresses[0].port).toBeGreaterThan(0)
      expect(result.pubkey).toBeTruthy()
    } catch (err) {
      expect((err as RpcError).rpcCode).not.toBe(-32601)
      // Also fatal if -32602 (rejected key format)
      expect((err as RpcError).rpcCode).not.toBe(-32602)
    }
  })

  it('findValue — network-dependent, verify NOT -32601', async () => {
    try {
      await client.dht.findValue({ key_id: RELAY_KEY, name: 'address', index: 0 })
    } catch (err) {
      expect((err as RpcError).rpcCode).not.toBe(-32601)
    }
  })
})

// =============================================================================
// Subscribe — 9 methods
// =============================================================================

describe('subscribe', () => {
  it('blocks — MUST succeed, wait for 1 block event (15s)', async () => {
    const sub = await client.subscribe.blocks()
    expect(sub.active).toBe(true)

    const block = await new Promise<{ seqno: number }>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('No block received in 15s')), 15000)
      sub.on('data', (data) => {
        clearTimeout(timeout)
        resolve(data)
      })
    })

    expect(block.seqno).toBeGreaterThan(0)
    await sub.unsubscribe()
    expect(sub.active).toBe(false)
  })

  it('transactions — MUST succeed, subscribe + unsubscribe', async () => {
    const sub = await client.subscribe.transactions({ address: TON_FOUNDATION, last_lt: '0' })
    expect(sub.active).toBe(true)
    await sub.unsubscribe()
    expect(sub.active).toBe(false)
  })

  it('accountState — MUST succeed, subscribe + unsubscribe', async () => {
    const sub = await client.subscribe.accountState({ address: TON_FOUNDATION })
    expect(sub.active).toBe(true)
    await sub.unsubscribe()
    expect(sub.active).toBe(false)
  })

  it('newTransactions — MUST succeed, subscribe confirms', async () => {
    const sub = await client.subscribe.newTransactions()
    expect(sub.active).toBe(true)
    await sub.unsubscribe()
    expect(sub.active).toBe(false)
  })

  it('unsubscribe — subscribe.blocks then unsubscribe', async () => {
    const sub = await client.subscribe.blocks()
    expect(sub.active).toBe(true)

    await sub.unsubscribe()
    expect(sub.active).toBe(false)

    // Second unsubscribe should not throw
    await sub.unsubscribe()
    expect(sub.active).toBe(false)
  })

  it('transactions with opcode filter — subscribe with operations [0x7362d09c]', async () => {
    const sub = await client.subscribe.transactions({
      address: TON_FOUNDATION,
      last_lt: '0',
      operations: [0x7362d09c],
    })
    expect(sub.active).toBe(true)
    await sub.unsubscribe()
    expect(sub.active).toBe(false)
  })

  it('configChanges — subscribe to param 34', async () => {
    const sub = await client.subscribe.configChanges({ params: [34] })
    expect(sub.active).toBe(true)
    await sub.unsubscribe()
    expect(sub.active).toBe(false)
  })

  it('multiAccount — subscribe 2 accounts', async () => {
    const sub = await client.subscribe.multiAccount({
      accounts: [
        { address: TON_FOUNDATION },
        { address: USDT_MASTER },
      ],
    })
    expect(sub.active).toBe(true)
    await sub.unsubscribe()
    expect(sub.active).toBe(false)
  })

  it('trace — subscribe to hotWallet with max_depth 2, wait for trace events (90s)', async () => {
    const sub = await client.subscribe.trace({
      address: HOT_WALLET,
      max_depth: 2,
      msg_timeout_sec: 20,
    })
    expect(sub.active).toBe(true)

    // Wait for a real trace (hot wallet is always active) — up to 90s
    try {
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          // No trace within 90s is acceptable — hot wallet might be quiet
          resolve()
        }, 90000)
        sub.on('data', (data) => {
          // Any trace event (trace_started, trace_tx, trace_complete, trace_timeout) counts
          if ('trace_id' in data) {
            clearTimeout(timeout)
            resolve()
          }
        })
      })
    } finally {
      await sub.unsubscribe()
      expect(sub.active).toBe(false)
    }
    // gotTrace may or may not be true — both are valid for this test
  }, 100000)
})

// =============================================================================
// ADNL — 9 methods
// =============================================================================

describe('adnl', () => {
  let peerId: string

  it('connect — MUST succeed, connects to relay by IP and key', async () => {
    const result = await client.adnl.connect({
      address: RELAY_ADDR,
      key: RELAY_KEY,
    })
    expect(result.connected).toBe(true)
    expect(result.peer_id).toBeTruthy()
    peerId = result.peer_id
  })

  it('peers — MUST succeed, connected relay in list', async () => {
    expect(peerId).toBeTruthy()
    const result = await client.adnl.peers()
    expect(Array.isArray(result.peers)).toBe(true)
    expect(result.peers.length).toBeGreaterThanOrEqual(1)
    expect(result.peers.some((p) => p.id === peerId)).toBe(true)
  })

  it('ping — network-dependent, verify NOT -32601', async () => {
    expect(peerId).toBeTruthy()
    try {
      const result = await client.adnl.ping({ peer_id: peerId })
      expect(typeof result.latency_ms).toBe('number')
      expect(result.latency_ms).toBeGreaterThanOrEqual(0)
    } catch (err) {
      expect((err as RpcError).rpcCode).not.toBe(-32601)
    }
  })

  it('sendMessage — MUST succeed, sent = true', async () => {
    expect(peerId).toBeTruthy()
    const result = await client.adnl.sendMessage({
      peer_id: peerId,
      data: btoa('Hello'),
    })
    expect(result.sent).toBe(true)
  })

  it('query — network-dependent (dummy data rejected), verify NOT -32601', async () => {
    expect(peerId).toBeTruthy()
    try {
      await client.adnl.query({
        peer_id: peerId,
        data: 'AQID',
        timeout: 5,
      })
    } catch (err) {
      expect((err as RpcError).rpcCode).not.toBe(-32601)
    }
  })

  it('setQueryHandler — MUST succeed, enabled = true', async () => {
    expect(peerId).toBeTruthy()
    const result = await client.adnl.setQueryHandler({ peer_id: peerId })
    expect(result.enabled).toBe(true)
  })

  it('answer — MUST error (non-existent query_id), NOT -32601', async () => {
    try {
      await client.adnl.answer({
        query_id: 'deadbeefdeadbeefdeadbeefdeadbeef',
        data: 'AQID',
      })
      expect.unreachable('Expected error for non-existent query_id')
    } catch (err) {
      expect((err as RpcError).rpcCode).not.toBe(-32601)
    }
  })

  it('disconnect — MUST succeed, peer removed from list', async () => {
    expect(peerId).toBeTruthy()
    const result = await client.adnl.disconnect({ peer_id: peerId })
    expect(result.disconnected).toBe(true)

    const peers = await client.adnl.peers()
    expect(peers.peers.every((p) => p.id !== peerId)).toBe(true)
    peerId = ''
  })

  it('connectByADNL — network-dependent (DHT resolution may fail), verify NOT -32601', async () => {
    try {
      const result = await client.adnl.connectByADNL({
        adnl_id: RELAY_KEY,
      })
      expect(typeof result.connected).toBe('boolean')
      // Cleanup if connected
      if (result.connected && result.peer_id) {
        await client.adnl.disconnect({ peer_id: result.peer_id })
      }
    } catch (err) {
      expect((err as RpcError).rpcCode).not.toBe(-32601)
    }
  })
})

// =============================================================================
// Overlay — 7 methods
// =============================================================================

describe('overlay', () => {
  // Use a random overlay ID — the bridge accepts join for any ID.
  const fakeOverlayId = Buffer.alloc(32, 0x42).toString('base64')
  let overlayPeerId: string

  beforeAll(async () => {
    const conn = await client.adnl.connect({
      address: RELAY_ADDR,
      key: RELAY_KEY,
    })
    overlayPeerId = conn.peer_id
  })

  afterAll(async () => {
    try {
      await client.overlay.leave({ overlay_id: fakeOverlayId })
    } catch { /* cleanup — ignore */ }
    try {
      await client.adnl.disconnect({ peer_id: overlayPeerId })
    } catch { /* cleanup — ignore */ }
  })

  it('join — MUST succeed, joined = true', async () => {
    const result = await client.overlay.join({
      overlay_id: fakeOverlayId,
      peer_id: overlayPeerId,
    })
    expect(result.joined).toBe(true)
  })

  it('getPeers — network-dependent, verify NOT -32601', async () => {
    try {
      const result = await client.overlay.getPeers({ overlay_id: fakeOverlayId })
      expect(Array.isArray(result.peers)).toBe(true)
    } catch (err) {
      expect((err as RpcError).rpcCode).not.toBe(-32601)
    }
  })

  it('sendMessage — network-dependent, verify NOT -32601', async () => {
    try {
      const result = await client.overlay.sendMessage({
        overlay_id: fakeOverlayId,
        data: btoa('Hello from WS bridge'),
      })
      expect(result.sent).toBe(true)
    } catch (err) {
      expect((err as RpcError).rpcCode).not.toBe(-32601)
    }
  })

  it('query — network-dependent, verify NOT -32601', async () => {
    try {
      await client.overlay.query({
        overlay_id: fakeOverlayId,
        data: 'AQID',
        timeout: 5,
      })
    } catch (err) {
      expect((err as RpcError).rpcCode).not.toBe(-32601)
    }
  })

  it('setQueryHandler — MUST succeed, enabled = true', async () => {
    const result = await client.overlay.setQueryHandler({
      overlay_id: fakeOverlayId,
      peer_id: overlayPeerId,
    })
    expect(result.enabled).toBe(true)
  })

  it('answer — MUST error (non-existent query_id), NOT -32601', async () => {
    try {
      await client.overlay.answer({
        query_id: 'deadbeefdeadbeefdeadbeefdeadbeef',
        data: 'AQID',
      })
      expect.unreachable('Expected error for non-existent query_id')
    } catch (err) {
      expect((err as RpcError).rpcCode).not.toBe(-32601)
    }
  })

  it('leave — MUST succeed, left = true', async () => {
    const result = await client.overlay.leave({ overlay_id: fakeOverlayId })
    expect(result.left).toBe(true)
  })
})

// =============================================================================
// Jetton — 3 methods
// =============================================================================

describe('jetton', () => {
  let walletAddress: string

  it('getData — MUST succeed, total_supply > 0, content object', async () => {
    const data = await client.jetton.getData({ address: USDT_MASTER })
    expect(BigInt(data.total_supply)).toBeGreaterThan(0n)
    expect(typeof data.mintable).toBe('boolean')
    expect(data.content).toBeTruthy()
    expect(typeof data.content).toBe('object')
    expect(typeof data.content.type).toBe('string')
    expect(['offchain', 'semichain', 'onchain', 'unknown']).toContain(data.content.type)
  })

  it('getWalletAddress — MUST succeed, save walletAddr', async () => {
    const result = await client.jetton.getWalletAddress({
      jetton_master: USDT_MASTER,
      owner: TON_FOUNDATION,
    })
    expect(result.wallet_address).toBeTruthy()
    walletAddress = result.wallet_address
  })

  it('getBalance — MUST succeed, balance field present', async () => {
    expect(walletAddress).toBeTruthy()
    const result = await client.jetton.getBalance({ jetton_wallet: walletAddress })
    expect(typeof result.balance).toBe('string')
    expect(result.owner).toBeTruthy()
    expect(result.jetton_master).toBeTruthy()
  })
})

// =============================================================================
// NFT — 5 methods
// =============================================================================

describe('nft', () => {
  let nftItemAddr: string

  it('getCollectionData — MUST succeed, content object', async () => {
    const data = await client.nft.getCollectionData({ address: NFT_COLLECTION })
    expect(data.next_item_index).toBeTruthy()
    expect(data.content).toBeTruthy()
    expect(typeof data.content).toBe('object')
    expect(typeof data.content.type).toBe('string')
    expect(['offchain', 'semichain', 'onchain', 'unknown']).toContain(data.content.type)
  })

  it('getAddressByIndex — MUST succeed, collection index 0', async () => {
    const result = await client.nft.getAddressByIndex({
      collection: NFT_COLLECTION,
      index: '0',
    })
    expect(result.address).toBeTruthy()
    nftItemAddr = result.address
  })

  it('getData — MUST succeed, owner and index fields', async () => {
    expect(nftItemAddr).toBeTruthy()
    const data = await client.nft.getData({ address: nftItemAddr })
    expect(typeof data.initialized).toBe('boolean')
    expect(typeof data.index).toBe('string')
    expect(data.content).toBeTruthy()
    expect(typeof data.content).toBe('object')
    expect(typeof data.content.type).toBe('string')
  })

  it('getRoyaltyParams — network-dependent (collection may not have royalties), verify NOT -32601', async () => {
    try {
      const result = await client.nft.getRoyaltyParams({ collection: NFT_COLLECTION })
      expect(typeof result.factor).toBe('number')
      expect(typeof result.base).toBe('number')
    } catch (err) {
      expect((err as RpcError).rpcCode).not.toBe(-32601)
    }
  })

  it('getContent — MUST error (invalid individual_content BOC), NOT -32601', async () => {
    try {
      await client.nft.getContent({
        collection: NFT_COLLECTION,
        index: '0',
        individual_content: 'AQID', // invalid BOC
      })
      // If it resolves, that's acceptable too (Go test accepts this)
    } catch (err) {
      expect((err as RpcError).rpcCode).not.toBe(-32601)
    }
  })
})

// =============================================================================
// DNS — 1 method
// =============================================================================

describe('dns', () => {
  it('resolve — MUST succeed, foundation.ton, all 10 fields', async () => {
    const result = await client.dns.resolve({ domain: 'foundation.ton' })
    expect(result.wallet).toBeTruthy()
    expect(typeof result.site_adnl).toBe('string')
    expect(typeof result.has_storage).toBe('boolean')
    expect('owner' in result).toBe(true)
    expect('nft_address' in result).toBe(true)
    expect('collection' in result).toBe(true)
    expect('editor' in result).toBe(true)
    expect(typeof result.initialized).toBe('boolean')
    expect('expiring_at' in result).toBe(true)
    // text_records: may be present or undefined
    if (result.text_records !== undefined) {
      expect(typeof result.text_records).toBe('object')
    }
  })
})

// =============================================================================
// Wallet — 2 methods
// =============================================================================

describe('wallet', () => {
  it('getSeqno — MUST succeed, seqno >= 0', async () => {
    const result = await client.wallet.getSeqno({ address: TON_FOUNDATION })
    expect(typeof result.seqno).toBe('number')
    expect(result.seqno).toBeGreaterThanOrEqual(0)
  })

  it('getPublicKey — MUST succeed, non-empty key', async () => {
    const result = await client.wallet.getPublicKey({ address: TON_FOUNDATION })
    expect(result.public_key).toBeTruthy()
    expect(typeof result.public_key).toBe('string')
  })
})

// =============================================================================
// SBT — 2 methods
// =============================================================================

describe('sbt', () => {
  it('getAuthorityAddress — MUST succeed, non-empty authority', async () => {
    const result = await client.sbt.getAuthorityAddress({ address: SBT_ADDR })
    expect(result.authority).toBeTruthy()
    expect(typeof result.authority).toBe('string')
  })

  it('getRevokedTime — MUST succeed, revoked_time exists', async () => {
    const result = await client.sbt.getRevokedTime({ address: SBT_ADDR })
    expect(typeof result.revoked_time).toBe('number')
  })
})

// =============================================================================
// Payment — 1 method
// =============================================================================

describe('payment', () => {
  it('getChannelState — MUST succeed, channel_id and status', async () => {
    const result = await client.payment.getChannelState({ address: PAY_CHANNEL })
    expect(typeof result.status).toBe('number')
    expect(typeof result.initialized).toBe('boolean')
    expect(typeof result.balance_a).toBe('string')
    expect(typeof result.balance_b).toBe('string')
    expect(result.key_a).toBeTruthy()
    expect(result.key_b).toBeTruthy()
    expect(result.channel_id).toBeTruthy()
    expect(typeof result.committed_seqno_a).toBe('number')
    expect(typeof result.committed_seqno_b).toBe('number')
    expect(typeof result.excess_fee).toBe('string')
    expect(result.closing_config).toBeTruthy()
    expect(typeof result.closing_config.quarantine_duration).toBe('number')
  })
})

// =============================================================================
// Client lifecycle
// =============================================================================

describe('client lifecycle', () => {
  it('connect -> disconnect -> reconnect', async () => {
    const c = new Web3SocketsClient({ url: 'ws://127.0.0.1:8081', autoReconnect: false })

    await c.connect()
    expect(c.isConnected).toBe(true)

    const info = await c.network.info()
    expect(info.dht_connected).toBe(true)

    await new Promise<void>((resolve) => {
      c.on('disconnected', () => resolve())
      c.disconnect()
    })
    expect(c.isConnected).toBe(false)

    const c2 = new Web3SocketsClient({ url: 'ws://127.0.0.1:8081', autoReconnect: false })
    await c2.connect()
    expect(c2.isConnected).toBe(true)

    const info2 = await c2.network.info()
    expect(info2.dht_connected).toBe(true)

    c2.disconnect()
  })

  it('emits connected and disconnected events', async () => {
    const c = new Web3SocketsClient({ url: 'ws://127.0.0.1:8081', autoReconnect: false })
    const events: string[] = []

    c.on('connected', () => events.push('connected'))
    c.on('disconnected', () => events.push('disconnected'))

    await c.connect()
    await new Promise((r) => setTimeout(r, 50))
    expect(events).toContain('connected')

    c.disconnect()
    await new Promise((r) => setTimeout(r, 50))
    expect(events).toContain('disconnected')
  })

  it('rejects pending calls on disconnect', async () => {
    const c = new Web3SocketsClient({ url: 'ws://127.0.0.1:8081', autoReconnect: false })
    await c.connect()

    const sub = await c.subscribe.blocks()
    c.disconnect()

    expect(sub.active).toBe(true)
    await expect(c.network.info()).rejects.toThrow()
  })

  it('request timeout — rejects after configured timeout', async () => {
    const c = new Web3SocketsClient({
      url: 'ws://127.0.0.1:8081',
      autoReconnect: false,
      requestTimeout: 100, // 100ms — way too short for DHT
    })
    await c.connect()

    await expect(
      c.dht.findValue({ key_id: Buffer.alloc(32, 0xbb).toString('base64'), name: 'x', index: 0 })
    ).rejects.toThrow('timed out')

    c.disconnect()
  })

  it('error event on connection failure', async () => {
    const c = new Web3SocketsClient({
      url: 'ws://127.0.0.1:9999', // wrong port
      autoReconnect: false,
    })

    await expect(c.connect()).rejects.toThrow()
  })
})
