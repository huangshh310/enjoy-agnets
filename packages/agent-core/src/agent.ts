/**
 * 编码 Agent：ToolLoopAgent + 写盘/shell 审批。
 * Harness 插件位用 toHarnessApprovalSettings() 拿 permissionMode / toolApproval。
 * 思考档走 AI SDK 7 顶层 reasoning，由 SDK 按模型映射；DeepSeek 仍补 providerOptions。
 */
import { ToolLoopAgent, type LanguageModel, type ModelMessage } from "ai"
import { type AgentMode, type ReasoningEffort } from "@enjoy-agents/ipc-contract"
import { systemPromptFor } from "./prompts"
import { createCodingTools } from "./tools"
import { createDelegateTool, runDelegatedSubagent } from "./agents/delegate.ts"
import type { WaitForSubagentApproval } from "./agents/subagent-approval.ts"
import type { AgentRuntimeContext } from "./runtime-context"
import { agentStopWhen } from "./policies/stop.ts"
import { agentLoopTimeout, prepareAgentStep } from "./policies/prepare-step.ts"
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
    extraTools?: Record<string, object>
    waitForSubagentApproval?: WaitForSubagentApproval
    maxSteps?: number
    stopAfterTools?: string[]
    stepTimeoutMs?: number
    toolTimeoutMs?: number
    onStepFinish?: (step: { stepNumber?: number }) => void
  }
) {
  const policy = options.policy
  const loopTimeout = agentLoopTimeout({
    stepMs: options.stepTimeoutMs,
    toolMs: options.toolTimeoutMs
  })

  return new ToolLoopAgent({
    model,
    instructions: systemPromptFor(mode),
    tools: {
      ...createCodingTools(options.runtimeContext.host),
      ...createDelegateTool((task) =>
        runDelegatedSubagent({
          model,
          task,
          host: options.runtimeContext.host,
          mode,
          policy,
          waitForApproval: options.waitForSubagentApproval
        })
      ),
      ...options.extraTools
    },
    runtimeContext: options.runtimeContext,
    ...(options.providerOptions ? { providerOptions: options.providerOptions } : {}),
    ...(options.reasoning ? { reasoning: options.reasoning } : {}),
    stopWhen: agentStopWhen({
      maxSteps: options.maxSteps,
      stopAfterTools: options.stopAfterTools
    }),
    prepareStep: prepareAgentStep,
    ...(loopTimeout ? { timeout: loopTimeout } : {}),
    ...(options.onStepFinish ? { onStepFinish: options.onStepFinish } : {}),
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
  extraTools?: Record<string, object>
  waitForSubagentApproval?: WaitForSubagentApproval
  maxSteps?: number
  stopAfterTools?: string[]
  stepTimeoutMs?: number
  toolTimeoutMs?: number
  onStepFinish?: (step: { stepNumber?: number }) => void
}) {
  const agent = createCodingAgent(options.model, options.mode, {
    policy: options.policy,
    runtimeContext: options.runtimeContext,
    reasoning: options.reasoning,
    providerOptions: options.providerOptions,
    extraTools: options.extraTools,
    waitForSubagentApproval: options.waitForSubagentApproval,
    maxSteps: options.maxSteps,
    stopAfterTools: options.stopAfterTools,
    stepTimeoutMs: options.stepTimeoutMs,
    toolTimeoutMs: options.toolTimeoutMs,
    onStepFinish: options.onStepFinish
  })
  return agent.stream({
    messages: options.messages,
    abortSignal: options.abortSignal
  })
}
