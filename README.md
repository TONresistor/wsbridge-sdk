# wsbridge-sdk

TypeScript SDK for the [TON WebSocket JSON-RPC bridge](https://github.com/TONresistor/Tonutils-Proxy). 61 typed methods across 12 namespaces with real-time subscriptions, ADNL peer messaging, and overlay networks.

Connects to [Tonutils-Proxy](https://github.com/TONresistor/Tonutils-Proxy) running locally or on a remote server. No centralized API, no rate limits. Direct access to the TON P2P network.

## Install

```bash
npm install wsbridge-sdk
```

`ws` is needed for Node.js environments. It is listed as an optional peer dependency:

```bash
npm install ws
```

The SDK uses the native `WebSocket` API.

## Prerequisites

The SDK connects to the WebSocket bridge exposed by [Tonutils-Proxy](https://github.com/TONresistor/Tonutils-Proxy). The proxy must be running before using the SDK.

```bash
# Build and start the proxy
git clone https://github.com/TONresistor/Tonutils-Proxy.git
cd Tonutils-Proxy
go build -o proxy ./cmd/proxy-cli/
./proxy --ws-addr 127.0.0.1:8081
```

Default endpoint: `ws://127.0.0.1:8081`. See the [proxy README](https://github.com/TONresistor/Tonutils-Proxy) for configuration options.

## Quickstart

### Query the blockchain

```typescript
import { Web3SocketsClient } from 'wsbridge-sdk'

const client = new Web3SocketsClient()
await client.connect()

const info = await client.lite.getMasterchainInfo()
console.log('Masterchain seqno:', info.seqno)

const state = await client.lite.getAccountState({
  address: 'EQD...your-address',
})
console.log('Balance:', state.balance, 'nanotons')

client.destroy()
```

### Subscribe to transactions

```typescript
const sub = await client.subscribe.transactions({
  address: 'EQD...your-address',
})

sub.on('data', (tx) => {
  console.log('New tx:', tx.hash, 'LT:', tx.lt)
})

// Clean up when done
await sub.unsubscribe()
```

### Resolve a .ton domain

```typescript
const result = await client.dns.resolve({ domain: 'foundation.ton' })
console.log('Wallet:', result.wallet)
console.log('Site ADNL:', result.site_adnl)
console.log('Text records:', result.text_records)
```

## Configuration

All options are optional. Pass them to the `Web3SocketsClient` constructor:

```typescript
const client = new Web3SocketsClient({
  url: 'ws://127.0.0.1:8081',   // Bridge WebSocket endpoint
  autoReconnect: true,            // Reconnect on disconnect (default: true)
  reconnectDelay: 1000,           // Initial reconnect delay in ms (default: 1000)
  reconnectMaxDelay: 30000,       // Maximum reconnect delay in ms (default: 30000)
  reconnectMaxRetries: Infinity,  // Max reconnect attempts (default: Infinity)
  keepaliveInterval: 30000,       // Ping interval in ms, Node.js only (default: 30000)
  requestTimeout: 30000,          // RPC request timeout in ms (default: 30000)
  logger: {                       // Optional structured logger
    debug: console.debug,
    warn: console.warn,
    error: console.error,
  },
})
```

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | `ws://127.0.0.1:8081` | Bridge WebSocket endpoint |
| `autoReconnect` | `boolean` | `true` | Automatically reconnect on unexpected disconnection |
| `reconnectDelay` | `number` | `1000` | Initial delay before first reconnect attempt (ms) |
| `reconnectMaxDelay` | `number` | `30000` | Maximum delay between reconnect attempts (ms, exponential backoff) |
| `reconnectMaxRetries` | `number` | `Infinity` | Maximum number of reconnect attempts |
| `keepaliveInterval` | `number` | `30000` | WebSocket ping interval (ms). Node.js only. Set to `0` to disable |
| `requestTimeout` | `number` | `30000` | Timeout for individual RPC requests (ms) |
| `logger` | `Logger` | `undefined` | Object with `debug`, `warn`, `error` methods |

## Connection lifecycle

```typescript
const client = new Web3SocketsClient()

await client.connect()       // Open the WebSocket connection
client.isConnected           // true when connected
client.state                 // Current TransportState

client.disconnect()          // Close gracefully (no auto-reconnect)
client.destroy()             // Permanent teardown, releases all resources
```

`TransportState` enum values: `DISCONNECTED`, `CONNECTING`, `CONNECTED`, `RECONNECTING`, `DESTROYED`.

## Events

The client emits four events:

| Event | Callback signature | Description |
|---|---|---|
| `connected` | `() => void` | WebSocket connection established |
| `disconnected` | `(code: number, reason: string) => void` | Connection closed |
| `error` | `(err: Error) => void` | Transport-level error |
| `stateChange` | `(newState: TransportState, oldState: TransportState) => void` | Any state transition |

```typescript
import { Web3SocketsClient, TransportState } from 'wsbridge-sdk'

const client = new Web3SocketsClient()

client.on('connected', () => {
  console.log('Connected to bridge')
})

client.on('disconnected', (code, reason) => {
  console.log(`Disconnected: ${code} ${reason}`)
})

client.on('error', (err) => {
  console.error('Transport error:', err.message)
})

client.on('stateChange', (newState, oldState) => {
  console.log(`${oldState} -> ${newState}`)
})

await client.connect()
```

Use `client.off(event, listener)` to remove a listener.

## Subscriptions

Subscription methods return a `Subscription<T>` object. Two consumption patterns are supported: callbacks and async iteration.

### Callback pattern

```typescript
const sub = await client.subscribe.transactions({
  address: 'EQD...your-address',
})

sub.on('data', (tx) => {
  console.log('Transaction:', tx.hash)
})

sub.on('error', (err) => {
  console.error('Subscription error:', err.message)
})

// Stop receiving events
await sub.unsubscribe()
```

### Async iterator pattern

```typescript
const sub = await client.subscribe.blocks()

for await (const block of sub) {
  console.log('Block seqno:', block.seqno)
  if (block.seqno > 50000000) break  // break auto-unsubscribes
}
```

### Subscription API

| Method / Property | Description |
|---|---|
| `on('data', cb)` | Register a data listener |
| `on('error', cb)` | Register an error listener |
| `off('data', cb)` | Remove a data listener |
| `off('error', cb)` | Remove an error listener |
| `unsubscribe()` | Stop the subscription and release resources |
| `active` | `boolean`, true while the subscription is active |
| `[Symbol.asyncIterator]()` | Consume events as an async iterable |

The async iterator respects backpressure via a `highWaterMark` option (default: 1000). When the buffer exceeds this limit, the oldest events are dropped:

```typescript
const sub = await client.subscribe.newTransactions()
// The highWaterMark is set internally on the Subscription.
// Default is 1000 buffered events before oldest are dropped.
```

## Error handling

All SDK errors extend `Web3SocketsError`, which carries a `.code` string:

```
Web3SocketsError          (base, .code: string)
  ConnectionError         (.url: string)
  ConnectionClosedError   (.closeCode: number)
  RpcError                (.rpcCode: number | undefined)
  TimeoutError
  ValidationError
```

Use `instanceof` to distinguish error types:

```typescript
import {
  Web3SocketsError,
  RpcError,
  ConnectionError,
  TimeoutError,
} from 'wsbridge-sdk'

try {
  await client.lite.getAccountState({ address: 'invalid' })
} catch (err) {
  if (err instanceof RpcError) {
    console.error(`RPC error [${err.rpcCode}]: ${err.message}`)
  } else if (err instanceof ConnectionError) {
    console.error(`Connection failed to ${err.url}: ${err.message}`)
  } else if (err instanceof TimeoutError) {
    console.error(`Request timed out: ${err.message}`)
  } else if (err instanceof Web3SocketsError) {
    console.error(`SDK error [${err.code}]: ${err.message}`)
  }
}
```

## AbortSignal

Every RPC method accepts an optional `AbortSignal` to cancel in-flight requests:

```typescript
const controller = new AbortController()

setTimeout(() => controller.abort(), 5000)

try {
  const txs = await client.lite.getTransactions(
    { address: 'EQD...', limit: 100 },
    { signal: controller.signal },
  )
} catch (err) {
  if (err instanceof TimeoutError) {
    console.log('Request was cancelled')
  }
}
```

## API reference

All 61 bridge methods organized by namespace. Each method is called as `client.<namespace>.<method>(params?, options?)`.

| Namespace | Methods |
|---|---|
| `dht` | `findAddresses`, `findOverlayNodes`, `findTunnelNodes`, `findValue` |
| `lite` | `getMasterchainInfo`, `getAccountState`, `runMethod`, `sendMessage`, `sendMessageWait`, `getTransactions`, `getTransaction`, `findTxByInMsgHash`, `findTxByOutMsgHash`, `getTime`, `lookupBlock`, `getBlockTransactions`, `getShards`, `getBlockchainConfig`, `sendAndWatch`, `getBlockData`, `getBlockHeader`, `getLibraries` |
| `subscribe` | `transactions`, `blocks`, `accountState`, `newTransactions`, `configChanges`, `multiAccount`, `trace` |
| `jetton` | `getData`, `getWalletAddress`, `getBalance` |
| `nft` | `getData`, `getCollectionData`, `getAddressByIndex`, `getRoyaltyParams`, `getContent` |
| `dns` | `resolve` |
| `adnl` | `connect`, `connectByADNL`, `sendMessage`, `ping`, `disconnect`, `peers`, `query`, `setQueryHandler`, `answer` |
| `network` | `info` |
| `overlay` | `join`, `leave`, `getPeers`, `sendMessage`, `query`, `setQueryHandler`, `answer` |
| `wallet` | `getSeqno`, `getPublicKey` |
| `sbt` | `getAuthorityAddress`, `getRevokedTime` |
| `payment` | `getChannelState` |

`subscribe.unsubscribe` is handled internally by the SDK when you call `sub.unsubscribe()`.

## Advanced examples

### ADNL peer messaging

Connect to a peer by ADNL address, send messages, and listen for incoming events:

```typescript
const client = new Web3SocketsClient()
await client.connect()

// Connect to a peer via DHT resolution
const peer = await client.adnl.connectByADNL({
  adnl_id: 'base64-encoded-adnl-id',
})
console.log('Connected, peer:', peer.peer_id)

// Listen for incoming messages
client.adnl.on('message', (event) => {
  console.log('Message from', event.peer_id, ':', event.data)
})

// Listen for peer disconnections
client.adnl.on('disconnected', (event) => {
  console.log('Peer disconnected:', event.peer_id)
})

// Send a message
await client.adnl.sendMessage({
  peer_id: peer.peer_id,
  data: 'base64-encoded-payload',
})

// Query-response pattern
const response = await client.adnl.query({
  peer_id: peer.peer_id,
  data: 'base64-encoded-tl-query',
})
console.log('Response:', response.data)

// Disconnect from peer
await client.adnl.disconnect({ peer_id: peer.peer_id })
```

### Jetton data with TEP-64 content

Query jetton master data including the full TEP-64 content object:

```typescript
const jetton = await client.jetton.getData({
  address: 'EQB...jetton-master',
})

console.log('Total supply:', jetton.total_supply)
console.log('Admin:', jetton.admin)

// content is a TEP-64 object with name, description, image, etc.
if (jetton.content) {
  console.log('Name:', jetton.content.name)
  console.log('Symbol:', jetton.content.symbol)
  console.log('Decimals:', jetton.content.decimals)
  console.log('Image:', jetton.content.image)
}
```

### Transaction tracing

Follow the full internal message chain of a transaction:

```typescript
const sub = await client.subscribe.trace({
  address: 'EQD...your-address',
  max_depth: 3,
  msg_timeout_sec: 10,
})

sub.on('data', (event) => {
  // Events are a union of TraceStartedEvent | TraceTxEvent | TraceCompleteEvent | TraceTimeoutEvent
  if ('root_tx' in event) {
    console.log('Trace started:', event.trace_id)
  } else if ('transaction' in event) {
    console.log('Internal tx at depth', event.depth)
  } else if ('total_txs' in event) {
    console.log('Trace complete:', event.total_txs, 'transactions')
    sub.unsubscribe()
  }
})
```

## Environment

| Runtime | WebSocket | Notes |
|---|---|---|
| **Browser** | Native `WebSocket` | No extra dependencies |
| **Node.js** (>=18) | `ws` package | Install as peer dependency |
| **Electron** | Auto-detects `IpcTransport` via `window.ton.adnl` | Falls back to `ws` |

The package ships dual ESM/CJS output:
- ESM: `dist/index.mjs`
- CJS: `dist/index.cjs`
- Types: `dist/index.d.ts` / `dist/index.d.mts`

## Protocol reference

See [WSBRIDGE.md](https://github.com/TONresistor/Tonutils-Proxy/blob/master/WSBRIDGE.md) for the full WebSocket JSON-RPC protocol specification.

## License

MIT 