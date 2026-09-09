/**
 * OMP 打开授权页 ≠ 已登录。轮询 inspect，等该供应商出现在 models / loggedIn。
 */
import type { InspectAgentToolResult } from "@enjoy-agents/ipc-contract"

export function providerLoggedIn(inspect: InspectAgentToolResult, providerId: string): boolean {
  if (inspect.providers?.some((item) => item.id === providerId && item.loggedIn)) return true
  const prefix = `${providerId}/`
  return inspect.models.some((item) => item.id === providerId || item.id.startsWith(prefix))
}

export async function waitCliProviderReady(opts: {
  inspect: () => Promise<InspectAgentToolResult>
  providerId: string
  intervalMs?: number
  timeoutMs?: number
  isCancelled?: () => boolean
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}): Promise<"ready" | "timeout" | "cancelled"> {
  const intervalMs = opts.intervalMs ?? 1_500
  const timeoutMs = opts.timeoutMs ?? 8 * 60_000
  const now = opts.now ?? Date.now
  const sleep = opts.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)))
  const start = now()
  while (now() - start <= timeoutMs) {
    if (opts.isCancelled?.()) return "cancelled"
    try {
      const snap = await opts.inspect()
      if (providerLoggedIn(snap, opts.providerId)) return "ready"
    } catch {
      /* 登录进程还在写凭证时 inspect 可能短暂失败，继续等 */
    }
    if (now() - start + intervalMs > timeoutMs) break
    await sleep(intervalMs)
  }
  return "timeout"
}
