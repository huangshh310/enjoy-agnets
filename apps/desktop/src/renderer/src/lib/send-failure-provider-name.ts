/**
 * 首字前失败卡（连不上 / 密钥没通过 / 拒绝 / 额度）里的「{name}」：跟这一轮实际走的引擎，不跟聊天密钥档案。
 * Enjoy 本地（enjoy-local）走 API 密钥：说供应商（品牌名 → 端点主机名 → 「模型服务」，defaultProviderFace），
 * 不说密钥档案名（luna P2 定稿：「Work key A」「E2E Stub Key」括号里也不出现；用户要看是哪把钥匙去「改密钥」）；
 * ACP / CLI 引擎（Amp、Claude Code、自定义助手…）失败时说引擎自己的名字（有显示名用显示名），
 * 否则用户会在 Amp 的会话里看到「连不上 DeepSeek」（luna m136b-62 / -91：「连不上 E2E Stub Key」）。
 */
import { resolveEngineFace } from "./agent-display-name.ts"
import type { ProviderFace } from "./provider-face.ts"

export function sendFailureProviderName(input: {
  /** 前台会话这一轮的引擎。 */
  runtimeId: string | null | undefined
  /** 已装 / 自定义助手列表（settings.agentTools）。 */
  tools: readonly { id: string; label?: string }[]
  /** preferences.agentDisplayNames。 */
  displayNames: Readonly<Record<string, string>>
  /** Enjoy 本地时的供应商称呼（defaultProviderFace 的结果），不是密钥档案名。 */
  provider: ProviderFace
}): ProviderFace {
  const runtimeId = input.runtimeId
  if (!runtimeId || runtimeId === "enjoy-local") return input.provider
  // 不在列表里的引擎：不拿 runtimeId（custom:xxx / 内部 id）顶名，退到「模型服务」（luna 锁定链第 3 档，leo #164 软 c）。
  // 也不拿 input.provider：那是 Enjoy 本地的供应商，不是这个引擎。
  const brandLabel = input.tools.find((tool) => tool.id === runtimeId)?.label?.trim() ?? ""
  const name = resolveEngineFace({ displayName: input.displayNames[runtimeId], brandLabel })
  return name ? { kind: "named", name } : { kind: "generic" }
}
