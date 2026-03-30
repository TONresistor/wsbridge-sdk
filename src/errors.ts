/** Base error class for all SDK errors. */
export class Web3SocketsError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'Web3SocketsError'
    Object.setPrototypeOf(this, Web3SocketsError.prototype)
  }
}

/** Thrown when the WebSocket connection cannot be established. */
export class ConnectionError extends Web3SocketsError {
  constructor(message: string, public url: string) {
    super(message, 'CONNECTION_ERROR')
    this.name = 'ConnectionError'
    Object.setPrototypeOf(this, ConnectionError.prototype)
  }
}

/** Thrown when the WebSocket connection is closed unexpectedly. */
export class ConnectionClosedError extends Web3SocketsError {
  constructor(public closeCode: number, reason: string) {
    super(reason || `Connection closed with code ${closeCode}`, 'CONNECTION_CLOSED')
    this.name = 'ConnectionClosedError'
    Object.setPrototypeOf(this, ConnectionClosedError.prototype)
  }
}

/** Thrown when the bridge returns a JSON-RPC error response. */
export class RpcError extends Web3SocketsError {
  constructor(message: string, public rpcCode?: number) {
    super(message, 'RPC_ERROR')
    this.name = 'RpcError'
    Object.setPrototypeOf(this, RpcError.prototype)
  }
}

/** Thrown when a JSON-RPC request exceeds its deadline. */
export class TimeoutError extends Web3SocketsError {
  constructor(method: string, timeoutMs: number) {
    super(`Request "${method}" timed out after ${timeoutMs}ms`, 'TIMEOUT')
    this.name = 'TimeoutError'
    Object.setPrototypeOf(this, TimeoutError.prototype)
  }
}

/** Thrown when request parameters fail client-side validation. */
export class ValidationError extends Web3SocketsError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}
