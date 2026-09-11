/**
 * 官方窗口和 CLI `loggedIn` 不是一回事（Cursor Dashboard token 仍可读用量）。
 * 有官方数字就原样留下；未登录且没数字才不给额度对象。
 */
import type { AgentToolQuotaInfo } from "@enjoy-agents/ipc-contract"

export function officialOrEmpty(
  loggedIn: boolean,
  official: AgentToolQuotaInfo | undefined,
  windowType: string,
  details?: string
): AgentToolQuotaInfo | undefined {
  if (official?.windows?.length || official?.hasQuota) return official
  if (!loggedIn) return undefined
  return official ?? { hasQuota: false, windowType, details }
}
