/**
 * 启动或按 checkpoint 续跑 Agent。泵循环在 agent-pump。
 */
import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import type { GenerationRequest } from "@enjoy-agents/agent-core"
import { isTodoContinueUserMessage, RunAgentInput } from "@enjoy-agents/ipc-contract"
import { getDatabase, setSetting } from "./database"
import { createId } from "./ids"
import { emitEvent, holdAgentRun } from "./agent-run-state"
import { prepareAndPump } from "./agent-run-prepare"
import { maybeRenameSession } from "./persist-session"
import { resolveRunSecret, resolveRuntimeId } from "./agent-run-helpers"
import { writeSessionRuntime } from "./agent-tools-vault"
import { formatHandoffContext, isAcpHostRuntime } from "@enjoy-agents/agent-harness"
import { metasFromAssetIds, persistUserTurn } from "./persist-user-attachments"
import { rememberGenerationRun, requestFromAgentInput } from "./persist-run"
import { readPreferences } from "./preferences"
import { toModelMessages } from "./to-model-messages"
import { getWorkspace } from "./workspace"
import { getActiveCompactedHistory, maybeAutoCompact } from "./session-compaction-service"
import { peekSessionHandoff, prependHandoffHistory } from "./session-handoff"
import { isE2eStub } from "./e2e-stub"

export async function runAgent(window: BrowserWindow, rawInput: unknown) {
  const input = RunAgentInput.parse(rawInput)
  return beginAgentRun(window, input, { persistUser: input.persistUser !== false })
}

export async function resumeAgentRun(
  window: BrowserWindow,
  runId: string,
  request: GenerationRequest,
  resumeMessages?: unknown
) {
  const messages = request.messages?.length
    ? request.messages
    : [{ role: "user" as const, content: request.prompt ?? "" }]
  if (!request.workspaceId) throw new Error("agent resume requires workspaceId.")
  return beginAgentRun(
    window,
    RunAgentInput.parse({
      sessionId: request.sessionId,
      workspaceId: request.workspaceId,
      modelId: request.modelId,
      messages,
      attachments: request.attachments
    }),
    { runId, persistUser: false, resumeMessages }
  )
}

async function beginAgentRun(
  window: BrowserWindow,
  input: RunAgentInput,
  options: { runId?: string; persistUser: boolean; resumeMessages?: unknown }
) {
  const prefs = readPreferences()
  const runtimeId = resolveRuntimeId(input, prefs)
  writeSessionRuntime(input.sessionId, runtimeId)
  input.runtimeId = runtimeId
  if (isAcpHostRuntime(runtimeId) && !input.modelId) {
    input.modelId = `cli:${runtimeId}`
  }
  const secret = await resolveRunSecret(runtimeId, prefs.codingRuntime, prefs.harnessId)
  if (isE2eStub() && !input.modelId) input.modelId = "stub-e2e"
  if (!isAcpHostRuntime(runtimeId) && prefs.codingRuntime !== "harness" && !input.modelId) {
    throw new Error("Choose a model in Settings → Providers before running an agent.")
  }

  const workspace = await getWorkspace(input.workspaceId)
  setSetting("lastWorkspaceId", workspace.id)
  const session = getDatabase()
    .prepare("SELECT id FROM sessions WHERE id = ? AND workspace_id = ?")
    .get(input.sessionId, input.workspaceId) as { id: string } | undefined
  if (!session) throw new Error("Unknown session for this workspace.")

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
  if (!options.resumeMessages) {
    rememberGenerationRun({ runId, request: requestFromAgentInput(input) })
  }

  const lastUser = [...input.messages].reverse().find((message) => message.role === "user")
  if (
    lastUser &&
    options.persistUser &&
    !isTodoContinueUserMessage(lastUser.content)
  ) {
    persistUserTurn(input.sessionId, lastUser.content, metasFromAssetIds(input.attachments))
    maybeRenameSession(input.sessionId, lastUser.content)
  }

  emitEvent(window, { type: "run.start", runId, sessionId: input.sessionId })
  void prepareAndPump(runId)
  return { runId }
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
