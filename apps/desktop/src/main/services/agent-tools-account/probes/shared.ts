/**
 * 已登录但没有官方数字时给空额度，让卡片画空条 + —。不要编造百分比。
 */
import type { AgentToolQuotaInfo } from "@enjoy-agents/ipc-contract"

export function officialOrEmpty(
  loggedIn: boolean,
  official: AgentToolQuotaInfo | undefined,
  windowType: string,
  details?: string
): AgentToolQuotaInfo | undefined {
  if (!loggedIn) return undefined
  return official ?? { hasQuota: false, windowType, details }
}
