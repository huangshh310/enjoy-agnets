/**
 * 按 runtimeId / 偏好打开 Enjoy Local、本机 ACP 或 SDK 沙箱流。
 */
import type { ModelMessage } from "ai"
import { insertRunStep } from "@enjoy-agents/db"
import { streamCodingAgent, type ApprovalPolicy, type WaitForSubagentApproval } from "@enjoy-agents/agent-core"
import { getDatabase } from "./database"
import { createId } from "./ids"
import {
  disposeAcpTurn,
  disposeHarnessTurn,
  isAcpHostRuntime,
  resolveHarnessAdapter,
  streamHarnessTurn
} from "@enjoy-agents/agent-harness"
import { type AgentMode, type ReasoningEffort } from "@enjoy-agents/ipc-contract"
import {
  createLanguageModel,
  reasoningCallOptions
} from "@enjoy-agents/providers"
import { readHarnessSecret } from "./harness-secrets"
import type { AppPreferences } from "./preferences"
import { findProfileByKinds, type StoredSecret } from "./secrets"
import { createWorkspaceHost } from "./workspace"
import { createMcpAgentTools } from "./mcp-agent-tools"
import { createE2eStubStream, isE2eStub } from "./e2e-stub"
import { captureOpenStreamPrompt } from "./inspect-prompt-service"
import { openAcpStream } from "./open-acp-stream"

export type OpenedCodingStream = {
  stream: AsyncIterable<Record<string, unknown>>
  result: unknown
  dispose: () => Promise<void>
}

/** 按偏好打开本机 ToolLoop 或 Claude Code Harness 流。 */
export async function openCodingStream(input: {
  runId: string
  mode: AgentMode
  messages: ModelMessage[]
  abortSignal: AbortSignal
  workspaceRoot: string
  sessionId: string
  modelId: string
  secret?: StoredSecret
  prefs: AppPreferences
  effort?: ReasoningEffort
  fast?: boolean
  sessionApprovedTools: ReadonlySet<string>
  waitForSubagentApproval?: WaitForSubagentApproval
  runtimeId?: string
  pullSteeringMessages?: () => ModelMessage[]
}) {
  const policy: ApprovalPolicy = {
    requireWriteApproval: input.prefs.requireWriteApproval,
    requireBashApproval: input.prefs.requireBashApproval,
    requireCommitApproval: input.prefs.requireCommitApproval,
    sessionApprovedTools: input.sessionApprovedTools
  }
  captureOpenStreamPrompt(input)

  if (isE2eStub()) {
    return {
      stream: createE2eStubStream(input.messages, input.abortSignal),
      result: {},
      dispose: async () => undefined
    }
  }
  if (isAcpHostRuntime(input.runtimeId)) {
    return openAcpStream({
      runId: input.runId,
      sessionId: input.sessionId,
      runtimeId: input.runtimeId ?? "",
      workspaceRoot: input.workspaceRoot,
      messages: input.messages,
      abortSignal: input.abortSignal,
      waitForSubagentApproval: input.waitForSubagentApproval,
      effort: input.effort,
      fast: input.fast
    })
  }
  if (input.prefs.codingRuntime === "harness") {
    return openHarnessStream(input, policy)
  }
  return openLocalStream(input, policy)
}

/** 按当前 Provider 选 Harness 适配器；模型 key 来自 Providers。 */
async function openHarnessStream(
  input: Parameters<typeof openCodingStream>[0],
  policy: ApprovalPolicy
): Promise<OpenedCodingStream> {
  const adapter = resolveHarnessAdapter(input.prefs.harnessId, input.secret?.provider)
  const sandbox = readHarnessSecret()
  const provider = adapter ? await findProfileByKinds(adapter.providerKinds) : undefined
  const providerApiKey = provider?.apiKey || sandbox?.anthropicApiKey || ""
  const opened = await streamHarnessTurn({
    runId: input.runId,
    messages: input.messages,
    abortSignal: input.abortSignal,
    agentInput: {
      adapterId: adapter?.id,
      providerKind: input.secret?.provider,
      mode: input.mode,
      policy,
      credentials: {
        providerApiKey,
        vercelToken: sandbox?.vercelToken,
        vercelTeamId: sandbox?.vercelTeamId,
        vercelProjectId: sandbox?.vercelProjectId
      },
      customInstructions: input.prefs.customInstructions,
      workspaceRoot: input.workspaceRoot
    }
  })
  return {
    stream: opened.stream,
    result: opened.result,
    dispose: opened.dispose
  }
}

/** 本机 ToolLoop：需要供应商密钥。 */
async function openLocalStream(
  input: Parameters<typeof openCodingStream>[0],
  policy: ApprovalPolicy
): Promise<OpenedCodingStream> {
  const secret = input.secret
  if (!secret) throw new Error("Add an API key in Settings before running an agent.")
  const thinking = reasoningCallOptions({
    provider: secret.provider,
    modelId: input.modelId,
    apiStyle: secret.apiStyle,
    effort: input.effort,
    baseURL: secret.baseURL
  })
  const result = await streamCodingAgent({
    model: createLanguageModel({
      provider: secret.provider,
      apiKey: secret.apiKey,
      baseURL: secret.baseURL,
      modelId: input.modelId,
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
    extraTools: createMcpAgentTools(),
    waitForSubagentApproval: input.waitForSubagentApproval,
    maxSteps: input.prefs.maxAgentSteps,
    stepTimeoutMs: input.prefs.stepTimeoutMs,
    toolTimeoutMs: input.prefs.toolTimeoutMs,
    onStepFinish: (step) => {
      insertRunStep(getDatabase(), {
        id: createId("stp"),
        runId: input.runId,
        idx: step.stepNumber ?? 0,
        label: "model-step",
        status: "completed"
      })
    },
    pullSteeringMessages: input.pullSteeringMessages,
    runtimeContext: {
      workspaceRoot: input.workspaceRoot,
      sessionId: input.sessionId,
      runId: input.runId,
      host: createWorkspaceHost(input.workspaceRoot)
    }
  })
  const stream = (result as { fullStream?: AsyncIterable<Record<string, unknown>> }).fullStream
  if (!stream) throw new Error("Agent stream did not expose fullStream.")
  return { stream, result, dispose: async () => undefined }
}

/** 结束本轮 Harness / ACP 子进程。 */
export async function disposeCodingStream(runId: string): Promise<void> {
  await disposeHarnessTurn(runId)
  await disposeAcpTurn(runId)
}
