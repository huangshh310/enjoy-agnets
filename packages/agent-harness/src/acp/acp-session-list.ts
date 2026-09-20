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
}): Promise<{ supported: boolean; sessions: AcpListedSession[] }> {
  const spawned = spawnAcpProcess({
    id: input.id,
    cwd: input.cwd,
    override: input.override
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
