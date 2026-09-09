/**
 * Enjoy Local ToolLoop 开流：密钥、Fast 模型、规则/技能尾巴。
 */
import { insertRunStep } from "@enjoy-agents/db"
import { streamCodingAgent, type ApprovalPolicy } from "@enjoy-agents/agent-core"
import {
  createLanguageModel,
  reasoningCallOptions
} from "@enjoy-agents/providers"
import { getDatabase } from "./database"
import { createId } from "./ids"
import { extraLocalInstructions } from "./inspect-prompt-instructions"
import { createMcpAgentTools } from "./mcp-agent-tools"
import type { OpenedCodingStream, OpenCodingStreamInput } from "./open-coding-stream-input"
import { listDiscoveredRules } from "./rules-service"
import type { StoredSecret } from "./secrets"
import { listInstalledSkills } from "./skills-service"
import { createWorkspaceHost } from "./workspace"

/** 本机 ToolLoop：需要供应商密钥。Fast 开且配了 fastModelId 才换模型。 */
export async function openLocalStream(
  input: OpenCodingStreamInput,
  policy: ApprovalPolicy
): Promise<OpenedCodingStream> {
  const secret = requireLocalSecret(input.secret)
  const modelId = localFastModelId(input.fast, secret.fastModelId, input.modelId)
  const thinking = reasoningCallOptions({
    provider: secret.provider,
    modelId,
    apiStyle: secret.apiStyle,
    effort: input.effort,
    baseURL: secret.baseURL
  })
  const result = await streamCodingAgent(
    localStreamOptions(input, policy, secret, modelId, thinking)
  )
  return openedLocalStream(result)
}

function localStreamOptions(
  input: OpenCodingStreamInput,
  policy: ApprovalPolicy,
  secret: StoredSecret,
  modelId: string,
  thinking: ReturnType<typeof reasoningCallOptions>
) {
  return {
    model: createLanguageModel({
      provider: secret.provider,
      apiKey: secret.apiKey,
      baseURL: secret.baseURL,
      modelId,
      apiStyle: secret.apiStyle,
      reasoningEffort: input.effort,
      customHeaders: secret.customHeaders,
      customBody: secret.customBody
    }),
    mode: input.mode,
    messages: input.messages,
    abortSignal: input.abortSignal,
    reasoning: thinking.reasoning,
    providerOptions: thinking.providerOptions,
    policy,
    extraTools: createMcpAgentTools({ mode: input.mode }),
    waitForSubagentApproval: input.waitForSubagentApproval,
    maxSteps: input.prefs.maxAgentSteps,
    stepTimeoutMs: input.prefs.stepTimeoutMs,
    toolTimeoutMs: input.prefs.toolTimeoutMs,
    onStepFinish: (step: { stepNumber?: number }) =>
      recordLocalModelStep(input.runId, step.stepNumber),
    pullSteeringMessages: input.pullSteeringMessages,
    extraInstructions: loadLocalInstructions(input),
    runtimeContext: {
      workspaceRoot: input.workspaceRoot,
      sessionId: input.sessionId,
      runId: input.runId,
      host: createWorkspaceHost(input.workspaceRoot, {
        takeQuestionAnswers: input.takeQuestionAnswers
      })
    }
  }
}

function requireLocalSecret(secret: StoredSecret | undefined): StoredSecret {
  if (!secret) throw new Error("Add an API key in Settings before running an agent.")
  return secret
}

function loadLocalInstructions(input: OpenCodingStreamInput): string {
  return extraLocalInstructions({
    customInstructions: input.prefs.customInstructions,
    rules: listDiscoveredRules({ workspacePath: input.workspaceRoot }),
    skills: listInstalledSkills({ workspacePath: input.workspaceRoot }),
    workspaceRoot: input.workspaceRoot
  })
}

function recordLocalModelStep(runId: string, stepNumber: number | undefined): void {
  insertRunStep(getDatabase(), {
    id: createId("stp"),
    runId,
    idx: stepNumber ?? 0,
    label: "model-step",
    status: "completed"
  })
}

function openedLocalStream(result: unknown): OpenedCodingStream {
  const stream = (result as { fullStream?: AsyncIterable<Record<string, unknown>> }).fullStream
  if (!stream) throw new Error("Agent stream did not expose fullStream.")
  return { stream, result, dispose: async () => undefined }
}

/** Fast 开且 profile 配了极速模型才切换；没配则保持当前模型。 */
function localFastModelId(fast: boolean | undefined, fastModelId: string | undefined, modelId: string): string {
  const id = fastModelId?.trim()
  return fast && id ? id : modelId
}
