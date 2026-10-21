/**
 * luna P2-1：失败卡说谁、「改密钥」开哪份，跟**这一轮实际走的**引擎 / 档案，不跟渲染端按默认路线猜。
 * Enjoy 本地：开跑时 resolveRunSecret 用的那份档案（run.profileId，免密钥的 Ollama 也有 id）。
 * ACP / CLI 引擎：设置里给它绑了供应商档案（useCustomProvider + providerId）才带那份；没绑就只带引擎。
 * 纯函数，overrides 由调用方读（fail-agent-pump 传 readAgentToolOverrides）。
 */
import type { AgentToolOverride } from "./agent-tools-override-merge"

export type FailedTurnRoute = { runtimeId: string; providerId?: string }

export function failedTurnRoute(
  run: { input: { runtimeId?: string | null }; profileId?: string },
  overrides: () => Readonly<Record<string, AgentToolOverride>>
): FailedTurnRoute {
  const runtimeId = run.input.runtimeId?.trim() || "enjoy-local"
  if (runtimeId === "enjoy-local") {
    return run.profileId ? { runtimeId, providerId: run.profileId } : { runtimeId }
  }
  const bound = overrides()[runtimeId]
  return bound?.useCustomProvider === true && bound.providerId ? { runtimeId, providerId: bound.providerId } : { runtimeId }
}
