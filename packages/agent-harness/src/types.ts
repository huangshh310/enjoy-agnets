/**
 * Harness 建 Agent 的入参。密钥只在 main 注入，适配器文件不读盘。
 */
import type { ApprovalPolicy } from "@enjoy-agents/agent-core"
import type { AgentMode } from "@enjoy-agents/ipc-contract"
import type { HarnessAdapterId } from "./catalog"

export type HarnessCredentials = {
  providerApiKey: string
  vercelToken?: string
  vercelTeamId?: string
  vercelProjectId?: string
}

export type CreateHarnessCodingAgentInput = {
  adapterId?: HarnessAdapterId | string
  providerKind?: string
  mode: AgentMode
  policy: ApprovalPolicy
  credentials: HarnessCredentials
  model?: string
  customInstructions?: string
  workspaceRoot?: string
}
