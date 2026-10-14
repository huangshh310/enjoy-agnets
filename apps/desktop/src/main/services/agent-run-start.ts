/**
 * 启动或按 checkpoint 续跑 Agent。泵循环在 agent-pump。
 */
import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import type { GenerationRequest } from "@enjoy-agents/agent-core"
import { inferAgentRunOrigin, RunAgentInput } from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./database"
import { rememberWorkspaceOpened } from "./workspace-remember.ts"
import { shouldRememberWorkspaceOnRun } from "./workspace-mru.ts"
import { createId } from "./ids"
import { persistSessionWorkflow } from "./apply-turn-outcome"
import { applyAgentRunSessionAllowReset } from "./conversation-session-allow"
import { applyExplicitSessionTruncate } from "./session-truncate"
import { emitEvent, getActiveRun } from "./agent-run-state"
import { holdRunThenPersistUser, outgoingUserIdConflict } from "./agent-run-hold"
import { MESSAGE_ID_SESSION_MISMATCH } from "@enjoy-agents/ipc-contract/session-truncate"
import { prepareAndPump } from "./agent-run-prepare"
import { maybeRenameSession } from "./persist-session"
import {
  readRunProfile,
  resolveBoundRunModelId,
  resolveRunSecret,
  resolveRuntimeId
} from "./agent-run-helpers"
import { foldMissingRunSecret } from "./missing-run-secret"
import { peekCachedChatReadiness, peekVerifiedLocalModel } from "./chat-readiness"
import { e2eChatReadiness } from "./e2e-chat-readiness"
import { e2eStubPackaged } from "./e2e-stub-gate"
import { selectedRouteGateCode, shouldSkipSelectedRouteGate } from "./selected-chat-route"
import { writeSessionRuntime } from "./agent-tools-vault"
import { formatHandoffContext, isAcpHostRuntime } from "@enjoy-agents/agent-harness"
import { metasFromAssetIds, persistUserTurnOutcome } from "./persist-user-attachments"
import { isInternalTodoContinueTurn, runAgentPersistUser, shouldPersistOutgoingUser } from "./outgoing-user-persist"
import { rememberGenerationRun, requestFromAgentInput } from "./persist-run"
import { readPreferences } from "./preferences"
import { toModelMessages } from "./to-model-messages"
import { getWorkspace } from "./workspace"
import { recordEnjoyCheckpoint } from "./workspace-git-checkpoint"
import { peekCommandReceipt, rememberCommandReceipt } from "./command-receipts"
import {
  stampForegroundUserOrigin,
  stripUntrustedAutomationFlags,
  trustedAutomationFlags,
  type TrustedRunAgentOptions
} from "./agent-run-trust"
import { getActiveCompactedHistory, maybeAutoCompact } from "./session-compaction-service"
import { peekSessionHandoff, prependHandoffHistory } from "./session-handoff"
import { isE2eCostSeed, isE2eStub } from "./e2e-stub"
import type { AgentRunResult } from "@enjoy-agents/ipc-contract/chat-readiness"
import { COST_LIVE_MODEL_ID } from "./cost-seed"
import { e2eAutomationSourceFromPrompt } from "./e2e-stub-desktop"
import { hydrateActiveRunUsage } from "./run-usage"
import { isInteractiveComposerRun, preStartModelCode, preStartSessionCode } from "./agent-run-prestart"
import { peekClientRequest, rememberClientRequest } from "./client-request-dedupe"
import { backgroundKindOf } from "./pre-output-fail"
import { readSessionTitle, snapshotSessionTurn } from "./pre-output-rollback"

export async function runAgent(
  window: BrowserWindow,
  rawInput: unknown,
  trust: TrustedRunAgentOptions = {}
) {
  const parsed = RunAgentInput.parse(rawInput)
  const stripped = trust.trustAutomationFlags ? parsed : stripUntrustedAutomationFlags(parsed)
  const input = stampForegroundUserOrigin(stripped, trust)
  return beginAgentRun(window, input, {
    persistUser: runAgentPersistUser(input),
    rememberMru: trust.rememberMru
  })
}

/** 心跳代发：run.start 带上用户句，前台线程才能补出气泡。origin 强制 heartbeat。 */
export async function runHeartbeatAgent(window: BrowserWindow, rawInput: unknown) {
  const parsed = RunAgentInput.parse(rawInput)
  const input = RunAgentInput.parse({ ...parsed, origin: "heartbeat" })
  return beginAgentRun(window, input, { persistUser: true, promptEcho: true })
}

export async function resumeAgentRun(
  window: BrowserWindow,
  runId: string,
  request: GenerationRequest,
  resumeMessages?: unknown,
  extras?: { denyAnyDesktop?: boolean; automationSource?: unknown; origin?: unknown }
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
      automationSource: source,
      origin: flags.origin
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
  // 闸与 resolveRunSecret 用同一份档案（只读一次 vault）。
  const runProfile = await readRunProfile().catch(() => undefined)
  const blocked = selectedRouteGateCode({
    skip: shouldSkipSelectedRouteGate({
      automationSource: input.automationSource,
      rememberMru: options.rememberMru,
      isResume: Boolean(options.runId),
      isHeartbeat: Boolean(options.promptEcho)
    }),
    runtimeId,
    codingRuntime: prefs.codingRuntime,
    hasEnjoySecret: runProfile ? runProfile.hasSecret : "unknown",
    verifiedLocal: peekVerifiedLocalModel(),
    credentialState: runProfile?.credentialState ?? fixtureCredentialState()
  })
  if (blocked) return { ok: false, code: blocked }
  writeSessionRuntime(input.sessionId, runtimeId)
  input.runtimeId = runtimeId
  const overlayModel = await resolveBoundRunModelId(input, runtimeId)
  if (overlayModel) input.modelId = overlayModel
  if (isAcpHostRuntime(runtimeId) && !input.modelId) {
    input.modelId = `cli:${runtimeId}`
  }
  let resolved: Awaited<ReturnType<typeof resolveRunSecret>>
  try {
    resolved = await resolveRunSecret(runtimeId, prefs.codingRuntime, prefs.harnessId, runProfile)
  } catch (error) {
    const folded = foldMissingRunSecret(error)
    if (folded) return folded
    throw error
  }
  const secret = resolved?.secret
  if (isE2eCostSeed() && (!input.modelId || input.modelId === "stub-e2e")) {
    input.modelId = COST_LIVE_MODEL_ID
  } else if (isE2eStub() && !input.modelId) {
    input.modelId = "stub-e2e"
  }
  if (isE2eStub()) {
    const source = e2eAutomationSourceFromPrompt(lastUserContent(input))
    if (source) input.automationSource = source
  }
  input.origin = inferAgentRunOrigin(input.origin, input.automationSource)
  const interactive = isInteractiveComposerRun({
    isResume: Boolean(options.runId),
    isHeartbeat: Boolean(options.promptEcho),
    automationSource: input.automationSource
  })
  const needsModel = !isAcpHostRuntime(runtimeId) && prefs.codingRuntime !== "harness" && !input.modelId
  const modelCode = preStartModelCode({ interactive, needsModel })
  if (modelCode) return { ok: false, code: modelCode }
  if (needsModel) {
    throw new Error("Choose a model in Settings → Providers before running an agent.")
  }

  const workspace = await getWorkspace(input.workspaceId)
  const session = getDatabase()
    .prepare("SELECT id FROM sessions WHERE id = ? AND workspace_id = ?")
    .get(input.sessionId, input.workspaceId) as { id: string } | undefined
  const sessionCode = preStartSessionCode({ interactive, sessionExists: Boolean(session) })
  if (sessionCode) return { ok: false, code: sessionCode }
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

  // 开跑前顺序：no_chat_route → 缺密钥 → NEED_MODEL → SESSION_NOT_READY → id 串会话预检 → 回执 → 挂 run。
  const lastUser = lastOutgoingUser(input)
  // leo 小修 2：用户句 id 已属别的会话就别开跑（不清允许、不截断、不挂 run）。
  if (options.persistUser && outgoingUserIdConflict(input.sessionId, lastUser?.id)) {
    return { ok: false, code: MESSAGE_ID_SESSION_MISMATCH }
  }
  if (input.commandId && !options.runId) {
    const existing = peekCommandReceipt(input.commandId)
    if (existing) {
      return existing.userMessageId
        ? { ok: true, runId: existing.runId, userMessageId: existing.userMessageId }
        : { ok: true, runId: existing.runId }
    }
  }
  if (input.clientRequestId && !options.runId) {
    const existing = peekClientRequest(input.sessionId, input.clientRequestId)
    if (existing) return { ok: true, runId: existing }
  }
  const runId = options.runId ?? createId("run")
  // 首字前回滚要复原的是截断 / 落用户句之前的会话头。
  const sessionSnapshot = snapshotSessionTurn(input.sessionId)
  let truncatedUserId: string | undefined
  // 用户句落在已有行上（只 UPDATE）：回滚不删，renderer 也别撤这个气泡。
  let keptUserMessage = false
  applyAgentRunSessionAllowReset({
    sessionId: input.sessionId,
    clearSessionAllow: input.clearSessionAllow,
    incomingMessageCount: input.messages.length
  })
  if (!options.runId && input.truncateAfterMessageId && input.expectedTailIds) {
    const cut = applyExplicitSessionTruncate({
      sessionId: input.sessionId,
      afterMessageId: input.truncateAfterMessageId,
      expectedTailIds: input.expectedTailIds,
      reason: "agent.run",
      persistUser:
        shouldPersistOutgoingUser(input, options.persistUser) && lastUser
          ? {
              content: lastUser.content,
              messageId: lastUser.id,
              attached: metasFromAssetIds(input.attachments)
            }
          : undefined,
      // 截断路径的用户句由截断事务落库。首字前回滚只删本轮新插入的行：
      // 重新生成 / 编辑重发只 UPDATE 已有行，回滚保留它（被截掉的尾巴不回来）。
      onUserPersisted: (outcome) => {
        if (outcome?.inserted) truncatedUserId = outcome.id
        else if (outcome) keptUserMessage = true
      }
    })
    if (!cut.ok) return { ok: false, code: cut.code === "TRUNCATE_MESSAGE_NOT_FOUND" ? "TRUNCATE_STALE_SNAPSHOT" : cut.code }
  }
  const modelMessages = await modelMessagesForStart(
    input,
    options.resumeMessages,
    secret?.contextWindow
  )
  // 挂 run 后紧接着落用户句；失败就撤 run 回稳定码，不留下永远 RUN_ACTIVE 的会话。
  let userMessageId: string | undefined =
    !options.runId && input.truncateAfterMessageId && input.expectedTailIds &&
    shouldPersistOutgoingUser(input, options.persistUser)
      ? lastUser?.id
      : undefined
  // leo MF-1：首字前回滚只删本轮**新插入**的用户句；userMessageId 只表示「已在库」（renderer 据此清稿）。
  let rollbackUserId: string | undefined = truncatedUserId
  const held = holdRunThenPersistUser(
    {
      runId,
      window,
      input,
      workspaceRoot: workspace.rootPath,
      secret,
      profileId: resolved?.profileId,
      credentialFingerprint: resolved?.fingerprint,
      messages: modelMessages,
      sessionSnapshot,
      // 只有全新一轮可首字前回滚；续跑 / 回挂沿用的行不归本轮。
      rollbackEligible: !options.runId,
      backgroundKind: backgroundKindOf({
        automationSource: input.automationSource,
        heartbeat: Boolean(options.promptEcho),
        rememberMru: options.rememberMru
      })
    },
    () => {
      if (options.runId || !input.truncateAfterMessageId) {
        const outcome = persistOutgoingUser(input, options.persistUser)
        if (outcome?.inserted) rollbackUserId = outcome.id
        else if (outcome) keptUserMessage = true
        userMessageId = outcome?.id ?? persistedOutgoingUserId(input, options.persistUser)
      }
    }
  )
  if (!held.ok) return held
  if (options.runId) {
    hydrateActiveRunUsage(runId)
    const run = getActiveRun(runId)
    if (run) {
      run.reaskReason = "restore"
      // 续跑可能复用已挂的 run：显式关掉首字前回滚，沿用的用户句 / 助手行都不归这次。
      run.rollbackEligible = false
    }
  }
  const live = getActiveRun(runId)
  if (live && rollbackUserId) live.userMessageId = rollbackUserId
  if (live && keptUserMessage) live.keptUserMessage = true
  // 回滚只在标题仍是本轮自动起的名时复原；等待期间用户改名不覆盖。
  if (live && live.rollbackEligible) live.titleAfterStart = readSessionTitle(input.sessionId)
  if (input.commandId) rememberCommandReceipt(input.commandId, runId, userMessageId)
  if (input.clientRequestId) rememberClientRequest(input.sessionId, input.clientRequestId, runId)
  if (!options.resumeMessages) {
    rememberGenerationRun({ runId, request: requestFromAgentInput(input) })
  }
  emitRunStart(window, input, runId, options.promptEcho)
  if (!options.resumeMessages && workspace.kind !== "ssh") {
    void recordEnjoyCheckpoint(workspace.rootPath, {
      sessionId: input.sessionId,
      runId,
      kind: "baseline"
    }).catch(() => undefined)
  }
  void prepareAndPump(runId)
  return userMessageId ? { ok: true, runId, userMessageId } : { ok: true, runId }
}

function emitRunStart(
  window: BrowserWindow,
  input: RunAgentInput,
  runId: string,
  promptEcho?: boolean
): void {
  const echoed = promptEcho && !isInternalTodoContinueTurn(input) ? lastUserContent(input) : ""
  const echoedId = echoed ? lastOutgoingUser(input)?.id : undefined
  persistSessionWorkflow(input.sessionId, "in_progress")
  emitEvent(window, {
    type: "run.start",
    runId,
    sessionId: input.sessionId,
    kind: "agent",
    ...(echoed ? { prompt: echoed } : {}),
    // leo #147 MF-1：代发用户句落库用的就是这个 id，气泡直接用它。
    ...(echoed && echoedId && echoedId.length <= 128 ? { promptMessageId: echoedId } : {})
  })
}

function lastOutgoingUser(input: RunAgentInput): RunAgentInput["messages"][number] | undefined {
  return [...input.messages].reverse().find((message) => message.role === "user")
}

function lastUserContent(input: RunAgentInput): string {
  const content = lastOutgoingUser(input)?.content
  return typeof content === "string" ? content.trim() : ""
}

/** 开跑凭证态缺记录时，只有 e2e 夹具快照可代答；正式运行不借缓存（可能是别的档案的）。 */
function fixtureCredentialState() {
  if (!e2eChatReadiness(process.env, e2eStubPackaged())) return undefined
  return peekCachedChatReadiness()?.credentialCheck?.state
}

/** 去重跳过（同一句刚落过库）时也算已在库：回这条用户句的 id（renderer 据此才清 main 里的稿）。 */
function persistedOutgoingUserId(input: RunAgentInput, persistUser: boolean): string | undefined {
  const lastUser = lastOutgoingUser(input)
  if (!lastUser || !shouldPersistOutgoingUser(input, persistUser)) return undefined
  return lastUser.id || undefined
}

function persistOutgoingUser(
  input: RunAgentInput,
  persistUser: boolean
): ReturnType<typeof persistUserTurnOutcome> {
  const lastUser = lastOutgoingUser(input)
  if (!lastUser || !shouldPersistOutgoingUser(input, persistUser)) return undefined
  const outcome = persistUserTurnOutcome(
    input.sessionId,
    lastUser.content,
    metasFromAssetIds(input.attachments),
    lastUser.id
  )
  maybeRenameSession(input.sessionId, lastUser.content)
  return outcome
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
