/**
 * 编码 Agent：ToolLoopAgent + 写盘/shell 审批。
 * 供应商相关的思考参数由调用方经 providerOptions / reasoning 传入。
 */
import { ToolLoopAgent, type LanguageModel, type ModelMessage } from "ai"
import { type AgentMode, type ReasoningEffort } from "@enjoy-agents/ipc-contract"
import { systemPromptFor } from "./prompts"
import { createCodingTools } from "./tools"
import type { AgentRuntimeContext } from "./runtime-context"

const MUTATING_TOOLS = ["edit_file", "write_file", "bash", "git_commit"] as const

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
    sessionApprovedTools?: ReadonlySet<string>
    runtimeContext: AgentRuntimeContext
    reasoning?: ReasoningEffort
    providerOptions?: AgentProviderOptions
  }
) {
  const readOnly = mode === "ask" || mode === "plan"

  return new ToolLoopAgent({
    model,
    instructions: systemPromptFor(mode),
    tools: createCodingTools(options.runtimeContext.host),
    runtimeContext: options.runtimeContext,
    ...(options.providerOptions ? { providerOptions: options.providerOptions } : {}),
    ...(options.reasoning ? { reasoning: options.reasoning } : {}),
    toolApproval: ({ toolCall }) => approveTool(toolCall.toolName, mode, readOnly, options)
  })
}

/** 启动 Agent 流式循环。 */
export async function streamCodingAgent(options: {
  model: LanguageModel
  mode: AgentMode
  messages: ModelMessage[]
  runtimeContext: AgentRuntimeContext
  abortSignal?: AbortSignal
  sessionApprovedTools?: ReadonlySet<string>
  reasoning?: ReasoningEffort
  providerOptions?: AgentProviderOptions
}) {
  const agent = createCodingAgent(options.model, options.mode, {
    sessionApprovedTools: options.sessionApprovedTools,
    runtimeContext: options.runtimeContext,
    reasoning: options.reasoning,
    providerOptions: options.providerOptions
  })
  return agent.stream({
    messages: options.messages,
    abortSignal: options.abortSignal
  })
}

function approveTool(
  toolName: string,
  mode: AgentMode,
  readOnly: boolean,
  options: { sessionApprovedTools?: ReadonlySet<string> }
) {
  if (options.sessionApprovedTools?.has(toolName)) return "approved"
  if (!MUTATING_TOOLS.includes(toolName as (typeof MUTATING_TOOLS)[number])) return undefined
  if (readOnly) return { type: "denied" as const, reason: `${mode} mode is read-only.` }
  return "user-approval"
}
