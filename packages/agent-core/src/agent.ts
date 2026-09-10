/**
 * 编码 Agent：ToolLoopAgent + 写盘/shell 审批。
 * Harness 插件位用 toHarnessApprovalSettings() 拿 permissionMode / toolApproval。
 * 思考档：官方族 / Kimi K3 走顶层 reasoning；DeepSeek / MiniMax / GLM 走 providerOptions。
 */
import { ToolLoopAgent, type LanguageModel, type ModelMessage } from "ai"
import { type AgentMode } from "@enjoy-agents/ipc-contract"
import {
  type CodingAgentOptions,
  type StreamCodingAgentOptions
} from "./coding-agent-options.ts"
import { joinInstructions } from "./join-instructions.ts"
import { systemPromptFor } from "./prompts.ts"
import { createCodingTools } from "./tools"
import { createDelegateTool, runDelegatedSubagent } from "./agents/delegate.ts"
import type { ApprovalPolicy } from "./tool-approval.ts"
import { agentStopWhen } from "./policies/stop.ts"
import { agentLoopTimeout, prepareAgentStep } from "./policies/prepare-step.ts"
import { resolveToolApproval } from "./tool-approval.ts"

export type { CodingAgentOptions, StreamCodingAgentOptions } from "./coding-agent-options.ts"

/** 创建带工具审批的编码 Agent。 */
export function createCodingAgent(
  model: LanguageModel,
  mode: AgentMode = "agent",
  options: CodingAgentOptions
) {
  const policy = options.policy
  const loopTimeout = agentLoopTimeout({
    stepMs: options.stepTimeoutMs,
    toolMs: options.toolTimeoutMs
  })
  return new ToolLoopAgent({
    model,
    instructions: joinInstructions(systemPromptFor(mode), options.extraInstructions),
    tools: codingAgentTools(model, mode, policy, options),
    runtimeContext: options.runtimeContext,
    ...(options.providerOptions ? { providerOptions: options.providerOptions } : {}),
    ...(options.reasoning ? { reasoning: options.reasoning } : {}),
    stopWhen: agentStopWhen({
      maxSteps: options.maxSteps,
      stopAfterTools: options.stopAfterTools
    }),
    prepareStep: (step) => codingPrepareStep(step, options.pullSteeringMessages),
    ...(loopTimeout ? { timeout: loopTimeout } : {}),
    ...(options.onStepFinish ? { onStepFinish: options.onStepFinish } : {}),
    toolApproval: ({ toolCall }) =>
      toolCall
        ? resolveToolApproval(toolCall.toolName, mode, policy, toolCall.input)
        : "not-applicable"
  })
}

/** 启动 Agent 流式循环。 */
export async function streamCodingAgent(options: StreamCodingAgentOptions) {
  const { model, mode, messages, abortSignal, ...agentOptions } = options
  const agent = createCodingAgent(model, mode, agentOptions)
  return agent.stream({ messages, abortSignal })
}

function codingAgentTools(
  model: LanguageModel,
  mode: AgentMode,
  policy: ApprovalPolicy,
  options: CodingAgentOptions
) {
  return {
    ...createCodingTools(options.runtimeContext.host, { mode }),
    ...createDelegateTool((task, parentToolCallId) =>
      runDelegatedSubagent({
        model,
        task,
        host: options.runtimeContext.host,
        mode,
        policy,
        waitForApproval: options.waitForSubagentApproval,
        extraInstructions: options.extraInstructions,
        parentToolCallId,
        onToolEvent: options.onSubagentToolEvent
      })
    ),
    ...options.extraTools
  }
}

function codingPrepareStep(
  step: { messages: ModelMessage[]; stepNumber?: number },
  pullSteeringMessages?: () => ModelMessage[]
) {
  const stepNumber = step.stepNumber ?? 0
  return prepareAgentStep({
    messages: step.messages,
    stepNumber,
    // step 0 不 drain，避免首跳 LLM 前就把纠偏吃掉。
    injectUserMessages: stepNumber > 0 ? pullSteeringMessages?.() : undefined
  })
}
