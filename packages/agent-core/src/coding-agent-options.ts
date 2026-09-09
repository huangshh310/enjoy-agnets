/**
 * 编码 Agent 与开流共用的选项袋，避免两处各写一长串字段。
 */
import type { LanguageModel, ModelMessage } from "ai"
import type { AgentMode, ReasoningEffort } from "@enjoy-agents/ipc-contract"
import type { WaitForSubagentApproval } from "./agents/subagent-approval.ts"
import type { AgentRuntimeContext } from "./runtime-context.ts"
import type { ApprovalPolicy } from "./tool-approval.ts"

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export type AgentProviderOptions = Record<string, { [key: string]: JsonValue }>

/** 创建 ToolLoop 所需的审批、超时与附加指令。 */
export type CodingAgentOptions = {
  policy: ApprovalPolicy
  runtimeContext: AgentRuntimeContext
  reasoning?: ReasoningEffort
  providerOptions?: AgentProviderOptions
  extraTools?: Record<string, object>
  waitForSubagentApproval?: WaitForSubagentApproval
  maxSteps?: number
  stopAfterTools?: string[]
  stepTimeoutMs?: number
  toolTimeoutMs?: number
  onStepFinish?: (step: { stepNumber?: number }) => void
  /** 每步 LLM 推理前拉取纠偏句；工具 execute 期间不要调用。 */
  pullSteeringMessages?: () => ModelMessage[]
  /** 自定义说明 + 常驻规则 + 技能索引，接在 systemPromptFor 后面。 */
  extraInstructions?: string
}

/** 开流：在创建选项上再带模型、消息与中止。 */
export type StreamCodingAgentOptions = CodingAgentOptions & {
  model: LanguageModel
  mode: AgentMode
  messages: ModelMessage[]
  abortSignal?: AbortSignal
}
