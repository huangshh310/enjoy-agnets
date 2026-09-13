/**
 * 每工作区一只 SSH 连接。IPC handler 只问 pool + host 工厂。
 */
import type { SshStatus } from "@enjoy-agents/ipc-contract"
import { createLiveSshConnection } from "./ssh-connection.ts"
import type { SshConnSpec, SshConnectionFactory, SshConnectionLayer } from "./ssh.types.ts"

type Pooled = {
  spec: SshConnSpec
  layer: SshConnectionLayer | null
  status: SshStatus
  error?: string
}

const pool = new Map<string, Pooled>()
let factory: SshConnectionFactory = createLiveSshConnection

export function setSshConnectionFactory(next: SshConnectionFactory) {
  factory = next
}

export function resetSshConnectionFactory() {
  factory = createLiveSshConnection
}

export function getSshPoolEntry(workspaceId: string): Pooled | undefined {
  return pool.get(workspaceId)
}

export function rememberSshSpec(workspaceId: string, spec: SshConnSpec, status: SshStatus = "idle") {
  const prev = pool.get(workspaceId)
  prev?.layer?.dispose()
  pool.set(workspaceId, { spec, layer: null, status })
}

export async function connectSshPool(workspaceId: string): Promise<Pooled> {
  const entry = pool.get(workspaceId)
  if (!entry) throw new Error(`Unknown SSH workspace: ${workspaceId}`)
  entry.status = "connecting"
  entry.error = undefined
  try {
    const layer = await factory(entry.spec)
    entry.layer = layer
    entry.status = "connected"
    return entry
  } catch (error) {
    entry.layer = null
    entry.status = "failed"
    entry.error = error instanceof Error ? error.message : String(error)
    throw error
  }
}

export function disconnectSshPool(workspaceId: string): Pooled | undefined {
  const entry = pool.get(workspaceId)
  if (!entry) return undefined
  entry.layer?.dispose()
  entry.layer = null
  entry.status = "disconnected"
  return entry
}

export function dropSshPool(workspaceId: string) {
  disconnectSshPool(workspaceId)
  pool.delete(workspaceId)
}

export function sshLabel(spec: SshConnSpec): string {
  return `${spec.user}@${spec.host}:${spec.remotePath}`
}
