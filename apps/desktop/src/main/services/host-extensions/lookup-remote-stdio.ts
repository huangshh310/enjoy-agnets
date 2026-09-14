/**
 * SSH 工作区：把白名单裸 bin 解析成远端绝对路径，供 session/new mcpServers 使用。
 */
import { quoteRemote } from "../ssh/ssh-path.ts"
import { getSshPoolEntry } from "../ssh/ssh-pool.ts"

/** 已连接才查；找不到或未连上就跳过该 stdio 行。 */
export async function lookupRemoteStdioBin(workspaceId: string, bin: string): Promise<string | undefined> {
  const entry = getSshPoolEntry(workspaceId)
  if (entry?.status !== "connected" || !entry.layer) return undefined
  const result = await entry.layer.exec(`command -v ${quoteRemote(bin)}`)
  if (result.exitCode !== 0) return undefined
  const abs = result.stdout.trim().split(/\s+/)[0] ?? ""
  if (!abs.startsWith("/")) return undefined
  return abs
}
