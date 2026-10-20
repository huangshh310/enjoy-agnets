/**
 * 短生命周期 spawn，列出 Agent 侧会话。不和正在跑的 Enjoy 会话抢 stdio。
 */
import { AcpClient } from "./client.ts"
import { spawnAcpProcess } from "./spawn.ts"
import type { SpawnOverride } from "../agent-tools/resolve-spawn.ts"
import type { AcpListedSession } from "./acp-listed-session.ts"

export async function listAcpRemoteSessions(input: {
  id: string
  cwd: string
  override?: SpawnOverride
  /** 自定义 ACP 助手入库的 env（和开跑时一致）。 */
  env?: Record<string, string>
}): Promise<{ supported: boolean; sessions: AcpListedSession[] }> {
  const spawned = spawnAcpProcess({
    id: input.id,
    cwd: input.cwd,
    override: input.override,
    ...(input.env ? { env: input.env } : {})
  })
  const client = new AcpClient(spawned.child)
  try {
    await client.initialize()
    if (!client.getSessionCaps().list) return { supported: false, sessions: [] }
    return { supported: true, sessions: await client.listRemoteSessions(input.cwd) }
  } finally {
    client.dispose("kill")
  }
}
