import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import { streamCodingAgent } from "@enjoy-agents/agent-core"
import {
  AbortAgentInput,
  ApprovalDecision,
  RunAgentInput,
  clampThoughtSeconds,
  serializeAssistantPayload,
  type StreamEvent,
  type ThreadToolCall
} from "@enjoy-agents/ipc-contract"
import { createLanguageModel, deepseekCallOptions } from "@enjoy-agents/providers"
import { consumeFullStream, type PendingApproval } from "./consume-stream"
import { getDatabase, setSetting } from "./database"
import { createId } from "./ids"
import {
  emptyTranscript,
  maybeRenameSession,
  persistMessage
} from "./persist-session"
import { hasSecret, readSecret, type StoredSecret } from "./secrets"
import { ensureAssistantReasoning, toModelMessages } from "./to-model-messages"
import { createWorkspaceHost, getWorkspace } from "./workspace"

type ActiveRun = {
  abort: AbortController
  messages: ModelMessage[]
  window: BrowserWindow
  input: RunAgentInput
  workspaceRoot: string
  secret: StoredSecret
  pendingApprovals: PendingApproval[]
  sessionApprovedTools: Set<string>
  pumping: boolean
  startedAt: number
}

const activeRuns = new Map<string, ActiveRun>()

export function emitEvent(window: BrowserWindow, event: StreamEvent) {
  if (window.isDestroyed()) return
  window.webContents.send("agent.event", event)
}

export async function listSessions(workspaceId: string) {
  return getDatabase()
    .prepare(
      "SELECT id, workspace_id as workspaceId, title, created_at as createdAt, updated_at as updatedAt FROM sessions WHERE workspace_id = ? ORDER BY updated_at DESC"
    )
    .all(workspaceId)
}

export async function listMessages(sessionId: string) {
  return getDatabase()
    .prepare(
      "SELECT id, session_id as sessionId, role, content, created_at as createdAt FROM messages WHERE session_id = ? ORDER BY created_at ASC"
    )
    .all(sessionId)
}

export async function createSession(workspaceId: string, title: string) {
  await getWorkspace(workspaceId)
  const now = Date.now()
  const record = {
    id: createId("ses"),
    workspaceId,
    title,
    createdAt: now,
    updatedAt: now
  }
  getDatabase()
    .prepare(
      "INSERT INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(record.id, record.workspaceId, record.title, record.createdAt, record.updatedAt)
  return record
}

export async function runAgent(window: BrowserWindow, rawInput: unknown) {
  const input = RunAgentInput.parse(rawInput)
  const ready = await hasSecret()
  const secret = await readSecret()
  if (!ready || !secret) {
    throw new Error("Add an API key in Settings before running an agent.")
  }
  if (!input.modelId) {
    throw new Error("Choose a model in Settings → Providers before running an agent.")
  }

  const workspace = await getWorkspace(input.workspaceId)
  setSetting("lastWorkspaceId", workspace.id)

  const session = getDatabase()
    .prepare("SELECT id FROM sessions WHERE id = ? AND workspace_id = ?")
    .get(input.sessionId, input.workspaceId) as { id: string } | undefined
  if (!session) {
    throw new Error("Unknown session for this workspace.")
  }

  const runId = createId("run")
  const abort = new AbortController()
  const modelMessages: ModelMessage[] = toModelMessages(input.messages)

  activeRuns.set(runId, {
    abort,
    messages: modelMessages,
    window,
    input,
    workspaceRoot: workspace.rootPath,
    secret,
    pendingApprovals: [],
    sessionApprovedTools: new Set(),
    pumping: false,
    startedAt: Date.now()
  })

  const lastUser = [...input.messages].reverse().find((message) => message.role === "user")
  if (lastUser) {
    persistMessage(input.sessionId, "user", lastUser.content)
    maybeRenameSession(input.sessionId, lastUser.content)
  }

  emitEvent(window, { type: "run.start", runId, sessionId: input.sessionId })
  void pumpStream(runId)
  return { runId }
}

export async function abortAgent(rawInput: unknown) {
  const { runId } = AbortAgentInput.parse(
    typeof rawInput === "string" ? { runId: rawInput } : rawInput
  )
  const run = activeRuns.get(runId)
  run?.abort.abort()
  activeRuns.delete(runId)
  return { ok: true }
}

export async function decideApproval(window: BrowserWindow, rawInput: unknown) {
  const decision = ApprovalDecision.parse(rawInput)
  const run = activeRuns.get(decision.runId)
  if (!run) {
    throw new Error("This agent run is no longer active.")
  }

  const pending = run.pendingApprovals.find((item) => item.approvalId === decision.approvalId)
  if (!pending) {
    throw new Error("No matching tool approval is waiting.")
  }

  const approved = decision.decision !== "deny"
  if (decision.decision === "allow_session") {
    run.sessionApprovedTools.add(pending.name)
  }

  run.pendingApprovals = run.pendingApprovals.filter(
    (item) => item.approvalId !== decision.approvalId
  )
  run.messages.push({
    role: "tool",
    content: [
      {
        type: "tool-approval-response",
        approvalId: decision.approvalId,
        approved,
        reason: decision.reason
      }
    ]
  } as ModelMessage)

  emitEvent(window, {
    type: "approval.resolved",
    runId: decision.runId,
    toolCallId: decision.toolCallId,
    decision: decision.decision
  })

  if (run.pendingApprovals.length === 0 && !run.pumping) {
    void pumpStream(decision.runId)
  }

  return { ok: true }
}

async function pumpStream(runId: string) {
  const run = activeRuns.get(runId)
  if (!run || run.pumping) return
  run.pumping = true
  run.pendingApprovals = []

  const { window, input, workspaceRoot, secret, abort, messages } = run
  try {
    const effort = input.reasoningEffort ?? secret.reasoningEffort;
    const result = await streamCodingAgent({
      model: createLanguageModel({
        provider: secret.provider,
        apiKey: secret.apiKey,
        baseURL: secret.baseURL,
        modelId: input.modelId,
        apiStyle: secret.apiStyle,
        reasoningEffort: effort,
        customHeaders: secret.customHeaders,
        customBody: secret.customBody
      }),
      mode: input.mode,
      messages,
      abortSignal: abort.signal,
      reasoning: effort,
      providerOptions: deepseekCallOptions(effort),
      sessionApprovedTools: run.sessionApprovedTools,
      runtimeContext: {
        workspaceRoot,
        sessionId: input.sessionId,
        runId,
        host: createWorkspaceHost(workspaceRoot)
      }
    })

    const transcript = emptyTranscript()
    const tools: ThreadToolCall[] = []
    const stream = (result as { fullStream?: AsyncIterable<Record<string, unknown>> }).fullStream
    if (!stream) {
      throw new Error("Agent stream did not expose fullStream.")
    }

    await consumeFullStream({
      stream,
      runId,
      window,
      tools,
      transcript,
      onApproval: (pending) => run.pendingApprovals.push(pending),
      emit: (event) => emitEvent(window, event)
    })

    const extraMessages = await readResponseMessages(result)
    if (extraMessages.length > 0) {
      run.messages.push(...ensureAssistantReasoning(extraMessages, transcript.think))
    }

    if (transcript.visible.trim() || transcript.think.trim() || tools.length > 0) {
      persistMessage(
        input.sessionId,
        "assistant",
        serializeAssistantPayload({
          content: transcript.visible,
          reasoning: transcript.think,
          tools,
          thoughtSeconds: clampThoughtSeconds(run.startedAt) ?? undefined
        })
      )
    }

    if (run.pendingApprovals.length > 0) {
      return
    }

    emitEvent(window, { type: "run.end", runId })
    activeRuns.delete(runId)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    emitEvent(window, { type: "run.error", runId, message })
    activeRuns.delete(runId)
  } finally {
    const current = activeRuns.get(runId)
    if (current) current.pumping = false
  }
}

async function readResponseMessages(result: unknown): Promise<ModelMessage[]> {
  const record = result as {
    responseMessages?: ModelMessage[]
    response?: Promise<{ messages?: ModelMessage[] }> | { messages?: ModelMessage[] }
  }
  if (Array.isArray(record.responseMessages) && record.responseMessages.length > 0) {
    return record.responseMessages
  }
  if (!record.response) return []
  const response = await record.response
  if (!response || !Array.isArray(response.messages)) return []
  return response.messages
}


