import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import { streamCodingAgent } from "@enjoy-agents/agent-core"
import {
  AbortAgentInput,
  ApprovalDecision,
  RunAgentInput,
  type StreamEvent
} from "@enjoy-agents/ipc-contract"
import { createLanguageModel } from "@enjoy-agents/providers"
import { getDatabase, setSetting } from "./database"
import { createId } from "./ids"
import { hasSecret, readSecret, type StoredSecret } from "./secrets"
import { createWorkspaceHost, getWorkspace } from "./workspace"

type PendingApproval = {
  approvalId: string
  toolCallId: string
  name: string
}

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
  const modelMessages: ModelMessage[] = input.messages.map((message) => ({
    role: message.role,
    content: message.content
  }))

  activeRuns.set(runId, {
    abort,
    messages: modelMessages,
    window,
    input,
    workspaceRoot: workspace.rootPath,
    secret,
    pendingApprovals: [],
    sessionApprovedTools: new Set(),
    pumping: false
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
    const result = await streamCodingAgent({
      model: createLanguageModel({
        provider: secret.provider,
        apiKey: secret.apiKey,
        baseURL: secret.baseURL,
        modelId: input.modelId,
        apiStyle: secret.apiStyle,
        customHeaders: secret.customHeaders,
        customBody: secret.customBody
      }),
      mode: input.mode,
      messages,
      abortSignal: abort.signal,
      sessionApprovedTools: run.sessionApprovedTools,
      runtimeContext: {
        workspaceRoot,
        sessionId: input.sessionId,
        runId,
        host: createWorkspaceHost(workspaceRoot)
      }
    })

    let assistantText = ""
    const stream = (result as { fullStream?: AsyncIterable<Record<string, unknown>> }).fullStream
    if (!stream) {
      throw new Error("Agent stream did not expose fullStream.")
    }

    for await (const part of stream) {
      const type = String(part.type ?? "")
      if (type === "text-delta") {
        const text = String(part.text ?? part.delta ?? "")
        assistantText += text
        emitEvent(window, { type: "text.delta", runId, text })
      } else if (type === "reasoning-delta") {
        emitEvent(window, {
          type: "reasoning.delta",
          runId,
          text: String(part.text ?? part.delta ?? "")
        })
      } else if (type === "tool-call" || type === "tool-call-streaming-start") {
        emitEvent(window, {
          type: "tool.start",
          runId,
          toolCallId: String(part.toolCallId ?? createId("tool")),
          name: String(part.toolName ?? "tool")
        })
      } else if (type === "tool-call-delta") {
        emitEvent(window, {
          type: "tool.args.delta",
          runId,
          toolCallId: String(part.toolCallId ?? ""),
          delta: String(part.argsTextDelta ?? part.delta ?? "")
        })
      } else if (type === "tool-result") {
        emitEvent(window, {
          type: "tool.result",
          runId,
          toolCallId: String(part.toolCallId ?? ""),
          name: String(part.toolName ?? "tool"),
          result: part.output ?? part.result
        })
      } else if (type === "tool-approval-request") {
        const pending: PendingApproval = {
          approvalId: String(part.approvalId ?? createId("apr")),
          toolCallId: String(part.toolCallId ?? createId("tool")),
          name: String(part.toolName ?? "tool")
        }
        run.pendingApprovals.push(pending)
        emitEvent(window, {
          type: "approval.required",
          runId,
          toolCallId: pending.toolCallId,
          approvalId: pending.approvalId,
          name: pending.name,
          args: part.input ?? part.args
        })
      }
    }

    const extraMessages = await readResponseMessages(result)
    if (extraMessages.length > 0) {
      run.messages.push(...extraMessages)
    }

    if (assistantText.trim()) {
      persistMessage(input.sessionId, "assistant", assistantText)
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
  const response = await record.response
  return Array.isArray(response?.messages) ? response.messages : []
}

function persistMessage(sessionId: string, role: string, content: string) {
  const now = Date.now()
  getDatabase()
    .prepare(
      "INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(createId("msg"), sessionId, role, content, now)
  getDatabase().prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run(now, sessionId)
}

function maybeRenameSession(sessionId: string, userText: string) {
  const current = getDatabase()
    .prepare("SELECT title FROM sessions WHERE id = ?")
    .get(sessionId) as { title: string } | undefined
  if (!current || current.title !== "New agent") return
  const title = userText.replace(/\s+/g, " ").slice(0, 42) || "New agent"
  getDatabase()
    .prepare("UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?")
    .run(title, Date.now(), sessionId)
}
