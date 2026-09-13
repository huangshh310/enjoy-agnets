/**
 * 探测 SSH 主机可达。不列目录；走同一连接工厂便于测试注入。
 */
import type { SshConnSpec } from "./ssh.types.ts"
import { createLiveSshConnection } from "./ssh-connection.ts"
import { getSshPoolEntry } from "./ssh-pool.ts"

let probeFactory = createLiveSshConnection

export function setSshProbeFactory(next: typeof createLiveSshConnection) {
  probeFactory = next
}

export function resetSshProbeFactory() {
  probeFactory = createLiveSshConnection
}

export async function probeSsh(spec: Omit<SshConnSpec, "remotePath">): Promise<{ ok: boolean; error?: string }> {
  try {
    const layer = await probeFactory({ ...spec, remotePath: "." })
    layer.dispose()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/** 已连接的工作区不必再开一只探测进程。 */
export function probeUsesLivePool(workspaceId: string): boolean {
  return getSshPoolEntry(workspaceId)?.status === "connected"
}
