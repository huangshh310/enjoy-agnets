/**
 * 按偏好打开本机 ToolLoop 或 Claude Code Harness 流。
 */
import type { ModelMessage } from "ai"
import { streamCodingAgent, type ApprovalPolicy } from "@enjoy-agents/agent-core"
import { disposeHarnessTurn, streamHarnessTurn } from "@enjoy-agents/agent-harness"
import { type AgentMode, type ReasoningEffort } from "@enjoy-agents/ipc-contract"
import { createLanguageModel, deepseekCallOptions } from "@enjoy-agents/providers"
import { readHarnessSecret } from "./harness-secrets"
import type { AppPreferences } from "./preferences"
import type { StoredSecret } from "./secrets"
import { createWorkspaceHost } from "./workspace"

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
  sessionApprovedTools: ReadonlySet<string>
}): Promise<OpenedCodingStream> {
  const policy: ApprovalPolicy = {
    requireWriteApproval: input.prefs.requireWriteApproval,
    requireBashApproval: input.prefs.requireBashApproval,
    requireCommitApproval: input.prefs.requireCommitApproval,
    sessionApprovedTools: input.sessionApprovedTools
  }

  if (input.prefs.codingRuntime === "harness") {
    return openHarnessStream(input, policy)
  }
  return openLocalStream(input, policy)
}

/** 走 Claude Code + Vercel Sandbox；不传本机供应商 modelId。 */
async function openHarnessStream(
  input: Parameters<typeof openCodingStream>[0],
  policy: ApprovalPolicy
): Promise<OpenedCodingStream> {
  const creds = readHarnessSecret()
  if (!creds?.anthropicApiKey || !creds.vercelToken) {
    throw new Error("Configure Claude Code and Vercel Sandbox credentials in Settings → Agent.")
  }
  const opened = await streamHarnessTurn({
    runId: input.runId,
    messages: input.messages,
    abortSignal: input.abortSignal,
    agentInput: {
      mode: input.mode,
      policy,
      credentials: creds,
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
    reasoning: input.effort,
    providerOptions: deepseekCallOptions(input.effort),
    policy,
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

/** 结束本轮 Harness session（本机流无资源可释）。 */
export async function disposeCodingStream(runId: string): Promise<void> {
  await disposeHarnessTurn(runId)
}
