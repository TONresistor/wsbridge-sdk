import { RpcEngine, CallOptions } from '../rpc'
import type { MethodMap } from '../types'

/**
 * Base class for all namespace implementations.
 * Provides a type-safe `call` helper wired to the MethodMap.
 */
export abstract class BaseNamespace {
  constructor(protected rpc: RpcEngine) {}

  /** Send a typed JSON-RPC call through the engine. */
  protected call<M extends keyof MethodMap>(
    method: M,
    params?: MethodMap[M]['params'],
    options?: CallOptions,
  ): Promise<MethodMap[M]['result']> {
    return this.rpc.call(method, params, options)
  }
}
