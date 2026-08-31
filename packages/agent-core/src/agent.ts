/**
 * 编码 Agent：ToolLoopAgent + 写盘/shell 审批。
 * Harness 插件位用 toHarnessApprovalSettings() 拿 permissionMode / toolApproval。
 * 思考档走 AI SDK 7 顶层 reasoning，由 SDK 按模型映射；DeepSeek 仍补 providerOptions。
 */
import { ToolLoopAgent, type LanguageModel, type ModelMessage } from "ai"
import { type AgentMode, type ReasoningEffort } from "@enjoy-agents/ipc-contract"
import { systemPromptFor } from "./prompts"
import { createCodingTools } from "./tools"
import type { AgentRuntimeContext } from "./runtime-context"
import { resolveToolApproval, type ApprovalPolicy } from "./tool-approval"

type AgentProviderOptions = {
  deepseek?: {
    thinking?: { type: "enabled" | "disabled" }
    reasoningEffort?: ReasoningEffort
  }
}

/** 创建带工具审批的编码 Agent。 */
export function createCodingAgent(
  model: LanguageModel,
  mode: AgentMode = "agent",
  options: {
    policy: ApprovalPolicy
    runtimeContext: AgentRuntimeContext
    reasoning?: ReasoningEffort
    providerOptions?: AgentProviderOptions
  }
) {
  const policy = options.policy

  return new ToolLoopAgent({
    model,
    instructions: systemPromptFor(mode),
    tools: createCodingTools(options.runtimeContext.host),
    runtimeContext: options.runtimeContext,
    ...(options.providerOptions ? { providerOptions: options.providerOptions } : {}),
    ...(options.reasoning ? { reasoning: options.reasoning } : {}),
    toolApproval: ({ toolCall }) =>
      resolveToolApproval(toolCall.toolName, mode, policy, toolCall.input)
  })
}

/** 启动 Agent 流式循环。 */
export async function streamCodingAgent(options: {
  model: LanguageModel
  mode: AgentMode
  messages: ModelMessage[]
  runtimeContext: AgentRuntimeContext
  abortSignal?: AbortSignal
  policy: ApprovalPolicy
  reasoning?: ReasoningEffort
  providerOptions?: AgentProviderOptions
}) {
  const agent = createCodingAgent(options.model, options.mode, {
    policy: options.policy,
    runtimeContext: options.runtimeContext,
    reasoning: options.reasoning,
    providerOptions: options.providerOptions
  })
  return agent.stream({
    messages: options.messages,
    abortSignal: options.abortSignal
  })
}
