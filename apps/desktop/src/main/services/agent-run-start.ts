/**
 * 启动或按 checkpoint 续跑 Agent。泵循环在 agent-pump。
 */
import type { BrowserWindow } from "electron"
import type { GenerationRequest } from "@enjoy-agents/agent-core"
import { RunAgentInput } from "@enjoy-agents/ipc-contract"
import { getDatabase, setSetting } from "./database"
import { createId } from "./ids"
import { emitEvent, holdAgentRun } from "./agent-run-state"
import { prepareAndPump } from "./agent-run-prepare"
import { maybeRenameSession } from "./persist-session"
import { resolveRunSecret } from "./agent-run-helpers"
import { metasFromAssetIds, persistUserTurn } from "./persist-user-attachments"
import { rememberGenerationRun, requestFromAgentInput } from "./persist-run"
import { readPreferences } from "./preferences"
import { toModelMessages } from "./to-model-messages"
import { getWorkspace } from "./workspace"

export async function runAgent(window: BrowserWindow, rawInput: unknown) {
  return beginAgentRun(window, RunAgentInput.parse(rawInput), { persistUser: true })
}

export async function resumeAgentRun(window: BrowserWindow, runId: string, request: GenerationRequest) {
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
    { runId, persistUser: false }
  )
}

async function beginAgentRun(
  window: BrowserWindow,
  input: RunAgentInput,
  options: { runId?: string; persistUser: boolean }
) {
  const prefs = readPreferences()
  const secret = await resolveRunSecret(prefs.codingRuntime, prefs.harnessId)
  if (prefs.codingRuntime !== "harness" && !input.modelId) {
    throw new Error("Choose a model in Settings → Providers before running an agent.")
  }

  const workspace = await getWorkspace(input.workspaceId)
  setSetting("lastWorkspaceId", workspace.id)
  const session = getDatabase()
    .prepare("SELECT id FROM sessions WHERE id = ? AND workspace_id = ?")
    .get(input.sessionId, input.workspaceId) as { id: string } | undefined
  if (!session) throw new Error("Unknown session for this workspace.")

  const runId = options.runId ?? createId("run")
  const modelMessages = toModelMessages(input.messages)
  holdAgentRun({
    runId,
    window,
    input,
    workspaceRoot: workspace.rootPath,
    secret,
    messages: modelMessages
  })
  rememberGenerationRun({ runId, request: requestFromAgentInput(input) })

  const lastUser = [...input.messages].reverse().find((message) => message.role === "user")
  if (lastUser && options.persistUser) {
    persistUserTurn(input.sessionId, lastUser.content, metasFromAssetIds(input.attachments))
    maybeRenameSession(input.sessionId, lastUser.content)
  }

  emitEvent(window, { type: "run.start", runId, sessionId: input.sessionId })
  void prepareAndPump(runId)
  return { runId }
}
