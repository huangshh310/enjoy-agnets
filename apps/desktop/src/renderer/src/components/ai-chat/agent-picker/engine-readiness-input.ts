/**
 * 从 AgentToolPublic 抽出就绪入参。capabilities 只在这里读一次。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { capabilitiesOf } from "@enjoy-agents/ipc-contract/runtime-capabilities"
import type { EngineReadinessInput } from "./engine-readiness"

export function readinessInputOf(
  tool: AgentToolPublic,
  extras?: { hasKey?: boolean }
): EngineReadinessInput {
  return {
    id: tool.id,
    status: tool.status,
    comingSoon: tool.comingSoon,
    requiresLogin: capabilitiesOf(tool).login,
    loggedIn: tool.authAccount?.loggedIn ?? null,
    hasKey: extras?.hasKey,
    usingVaultProvider: Boolean(tool.useCustomProvider && tool.providerId),
    boundHasKey: tool.boundHasKey
  }
}
