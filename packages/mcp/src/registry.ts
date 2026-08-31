/**
 * 本机 MCP 会话句柄注册表。SDK 无 createMCPClient 时仍统一生命周期。
 */
import type { McpClientHandle } from "./client.ts"

export type McpHandleRegistry = {
  get: (id: string) => McpClientHandle | undefined
  set: (id: string, handle: McpClientHandle) => void
  delete: (id: string) => void
  close: (id: string) => void
  listConnected: () => McpClientHandle[]
}

export function createMcpHandleRegistry(): McpHandleRegistry {
  const handles = new Map<string, McpClientHandle>()
  return {
    get(id) {
      return handles.get(id)
    },
    set(id, handle) {
      handles.set(id, handle)
    },
    delete(id) {
      handles.delete(id)
    },
    close(id) {
      handles.get(id)?.close?.()
      handles.delete(id)
    },
    listConnected() {
      return [...handles.values()].filter((handle) => handle.state === "connected")
    }
  }
}
