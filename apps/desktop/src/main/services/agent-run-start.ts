/**
 * 启动或按 checkpoint 续跑 Agent。泵循环在 agent-pump。
 */
import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import type { GenerationRequest } from "@enjoy-agents/agent-core"
import { isTodoContinueUserMessage, RunAgentInput } from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./database"
import { rememberWorkspaceOpened } from "./workspace-remember.ts"
import { shouldRememberWorkspaceOnRun } from "./workspace-mru.ts"
import { createId } from "./ids"
import { persistSessionWorkflow } from "./apply-turn-outcome"
import { emitEvent, getActiveRun, holdAgentRun } from "./agent-run-state"
import { prepareAndPump } from "./agent-run-prepare"
import { maybeRenameSession } from "./persist-session"
import { resolveBoundRunModelId, resolveRunSecret, resolveRuntimeId } from "./agent-run-helpers"
import { peekVerifiedLocalModel } from "./chat-readiness"
import { hasSecret } from "./secrets"
import { selectedRouteGateCode, shouldSkipSelectedRouteGate } from "./selected-chat-route"
import { writeSessionRuntime } from "./agent-tools-vault"
import { formatHandoffContext, isAcpHostRuntime } from "@enjoy-agents/agent-harness"
import { metasFromAssetIds, persistUserTurn } from "./persist-user-attachments"
import { rememberGenerationRun, requestFromAgentInput } from "./persist-run"
import { readPreferences } from "./preferences"
import { toModelMessages } from "./to-model-messages"
import { getWorkspace } from "./workspace"
import { recordEnjoyCheckpoint } from "./workspace-git-checkpoint"
import { peekCommandReceipt, rememberCommandReceipt } from "./command-receipts"
import {
  stripUntrustedAutomationFlags,
  trustedAutomationFlags,
  type TrustedRunAgentOptions
} from "./agent-run-trust"
import { getActiveCompactedHistory, maybeAutoCompact } from "./session-compaction-service"
import { peekSessionHandoff, prependHandoffHistory } from "./session-handoff"
import { isE2eCostSeed, isE2eStub } from "./e2e-stub"
import type { AgentRunResult } from "@enjoy-agents/ipc-contract/chat-readiness"
import { NO_CHAT_ROUTE } from "@enjoy-agents/ipc-contract/chat-readiness"
import { COST_LIVE_MODEL_ID } from "./cost-seed"
import { e2eAutomationSourceFromPrompt } from "./e2e-stub-desktop"
import { hydrateActiveRunUsage } from "./run-usage"

export async function runAgent(
  window: BrowserWindow,
  rawInput: unknown,
  trust: TrustedRunAgentOptions = {}
) {
  const parsed = RunAgentInput.parse(rawInput)
  const input = trust.trustAutomationFlags ? parsed : stripUntrustedAutomationFlags(parsed)
  return beginAgentRun(window, input, {
    persistUser: input.persistUser !== false,
    rememberMru: trust.rememberMru
  })
}

/** 心跳代发：run.start 带上用户句，前台线程才能补出气泡。 */
export async function runHeartbeatAgent(window: BrowserWindow, rawInput: unknown) {
  const input = RunAgentInput.parse(rawInput)
  return beginAgentRun(window, input, { persistUser: true, promptEcho: true })
}

export async function resumeAgentRun(
  window: BrowserWindow,
  runId: string,
  request: GenerationRequest,
  resumeMessages?: unknown,
  extras?: { denyAnyDesktop?: boolean; automationSource?: unknown }
) {
  const messages = request.messages?.length
    ? request.messages
    : [{ role: "user" as const, content: request.prompt ?? "" }]
  if (!request.workspaceId) throw new Error("agent resume requires workspaceId.")
  const existing = getActiveRun(runId)?.input
  const flags = trustedAutomationFlags(extras, existing)
  const source = flags.automationSource
    ? { ...flags.automationSource, isCatchUp: false }
    : undefined
  return beginAgentRun(
    window,
    RunAgentInput.parse({
      sessionId: request.sessionId,
      workspaceId: request.workspaceId,
      modelId: request.modelId,
      messages,
      attachments: request.attachments,
      denyAnyDesktop: flags.denyAnyDesktop,
      automationSource: source
    }),
    { runId, persistUser: false, resumeMessages }
  )
}

async function beginAgentRun(
  window: BrowserWindow,
  input: RunAgentInput,
  options: {
    runId?: string
    persistUser: boolean
    resumeMessages?: unknown
    promptEcho?: boolean
    rememberMru?: boolean
  }
): Promise<AgentRunResult> {
  const prefs = readPreferences()
  const runtimeId = resolveRuntimeId(input, prefs)
  const blocked = selectedRouteGateCode({
    skip: shouldSkipSelectedRouteGate({
      automationSource: input.automationSource,
      rememberMru: options.rememberMru,
      isResume: Boolean(options.runId),
      isHeartbeat: Boolean(options.promptEcho)
    }),
    runtimeId,
    codingRuntime: prefs.codingRuntime,
    hasEnjoySecret: await hasSecret().catch(() => "unknown" as const),
    verifiedLocal: peekVerifiedLocalModel()
  })
  if (blocked) return { ok: false, code: NO_CHAT_ROUTE }
  writeSessionRuntime(input.sessionId, runtimeId)
  input.runtimeId = runtimeId
  const overlayModel = await resolveBoundRunModelId(input, runtimeId)
  if (overlayModel) input.modelId = overlayModel
  if (isAcpHostRuntime(runtimeId) && !input.modelId) {
    input.modelId = `cli:${runtimeId}`
  }
  const secret = await resolveRunSecret(runtimeId, prefs.codingRuntime, prefs.harnessId)
  if (isE2eCostSeed() && (!input.modelId || input.modelId === "stub-e2e")) {
    input.modelId = COST_LIVE_MODEL_ID
  } else if (isE2eStub() && !input.modelId) {
    input.modelId = "stub-e2e"
  }
  if (isE2eStub()) {
    const source = e2eAutomationSourceFromPrompt(lastUserContent(input))
    if (source) input.automationSource = source
  }
  if (!isAcpHostRuntime(runtimeId) && prefs.codingRuntime !== "harness" && !input.modelId) {
    throw new Error("Choose a model in Settings → Providers before running an agent.")
  }

  const workspace = await getWorkspace(input.workspaceId)
  const session = getDatabase()
    .prepare("SELECT id FROM sessions WHERE id = ? AND workspace_id = ?")
    .get(input.sessionId, input.workspaceId) as { id: string } | undefined
  if (!session) throw new Error("Unknown session for this workspace.")
  if (
    shouldRememberWorkspaceOnRun({
      automationSource: input.automationSource,
      isResume: Boolean(options.runId),
      isHeartbeat: Boolean(options.promptEcho),
      rememberMru: options.rememberMru
    })
  ) {
    rememberWorkspaceOpened(workspace.id)
  }

  if (input.commandId && !options.runId) {
    const existing = peekCommandReceipt(input.commandId)
    if (existing) return { ok: true, runId: existing }
  }
  const runId = options.runId ?? createId("run")
  const modelMessages = await modelMessagesForStart(
    input,
    options.resumeMessages,
    secret?.contextWindow
  )
  holdAgentRun({
    runId,
    window,
    input,
    workspaceRoot: workspace.rootPath,
    secret,
    messages: modelMessages
  })
  if (options.runId) hydrateActiveRunUsage(runId)
  if (input.commandId) rememberCommandReceipt(input.commandId, runId)
  if (!options.resumeMessages) {
    rememberGenerationRun({ runId, request: requestFromAgentInput(input) })
  }
  persistOutgoingUser(input, options.persistUser)
  emitRunStart(window, input, runId, options.promptEcho)
  if (!options.resumeMessages && workspace.kind !== "ssh") {
    void recordEnjoyCheckpoint(workspace.rootPath, {
      sessionId: input.sessionId,
      runId,
      kind: "baseline"
    }).catch(() => undefined)
  }
  void prepareAndPump(runId)
  return { ok: true, runId }
}

function emitRunStart(
  window: BrowserWindow,
  input: RunAgentInput,
  runId: string,
  promptEcho?: boolean
): void {
  const echoed = promptEcho ? lastUserContent(input) : ""
  persistSessionWorkflow(input.sessionId, "in_progress")
  emitEvent(window, {
    type: "run.start",
    runId,
    sessionId: input.sessionId,
    ...(echoed ? { prompt: echoed } : {})
  })
}

function lastOutgoingUser(input: RunAgentInput): RunAgentInput["messages"][number] | undefined {
  return [...input.messages].reverse().find((message) => message.role === "user")
}

function lastUserContent(input: RunAgentInput): string {
  const content = lastOutgoingUser(input)?.content
  return typeof content === "string" ? content.trim() : ""
}

function persistOutgoingUser(input: RunAgentInput, persistUser: boolean) {
  const lastUser = lastOutgoingUser(input)
  if (!lastUser || !persistUser || isTodoContinueUserMessage(lastUser.content)) return
  persistUserTurn(
    input.sessionId,
    lastUser.content,
    metasFromAssetIds(input.attachments),
    lastUser.id
  )
  maybeRenameSession(input.sessionId, lastUser.content)
}

async function modelMessagesForStart(
  input: RunAgentInput,
  resumeMessages?: unknown,
  contextWindow?: number
): Promise<ModelMessage[]> {
  if (Array.isArray(resumeMessages) && resumeMessages.length > 0) {
    return resumeMessages as ModelMessage[]
  }
  await maybeAutoCompact(input.sessionId, input.messages, contextWindow)
  const effectiveMessages = await getActiveCompactedHistory(input.sessionId, input.messages)
  const peeked = peekSessionHandoff(input.sessionId)
  const handoffText = peeked ? formatHandoffContext(peeked).trim() : null
  const history = prependHandoffHistory(effectiveMessages, handoffText)
  return toModelMessages(history)
}
