/**
 * running 中途结清：封 restart_abandoned、走 decideTurnOutcome，不清掉原 runs.error。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import type { BrowserWindow } from "electron"
import { fileURLToPath } from "node:url"
import { insertRun, getRun } from "@enjoy-agents/db"
import { parseAssistantPayload, serializeAssistantPayload } from "@enjoy-agents/ipc-contract"
import { RESTART_ABANDONED_CODE } from "@enjoy-agents/ipc-contract/desktop-notify"
import { RESTORE_INTERRUPTED_RUNNING } from "@enjoy-agents/ipc-contract/restore-codes"

const dir = dirname(fileURLToPath(import.meta.url))

const {
  emitQueuedInterruptedRunning,
  getDatabase,
  persistMessage,
  queueInterruptedRunningSettle,
  resetInterruptedRunningForTest
} = await import("./restore-interrupted-running.behavior.load.ts")

function seedSession(input: { workspaceId: string; sessionId: string }): void {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(input.workspaceId, "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(input.sessionId, input.workspaceId, "interrupted", 1, 1)
}

test("写类已开始：中途结清进待验收，工具行 restart_abandoned，不是无条件 todo", () => {
  resetInterruptedRunningForTest()
  const sessionId = "ses_int_write"
  const runId = "run_int_write"
  seedSession({ workspaceId: "ws_int_write", sessionId })
  const db = getDatabase()
  persistMessage(sessionId, "user", "please write")
  persistMessage(
    sessionId,
    "assistant",
    serializeAssistantPayload({
      content: "",
      tools: [
        {
          id: "tool_write",
          name: "write_file",
          state: "input-available",
          args: { path: "note.txt" },
          result: { decision: "allow" }
        }
      ]
    })
  )
  insertRun(db, {
    id: runId,
    sessionId,
    workspaceId: "ws_int_write",
    kind: "agent",
    status: "running",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  const row = getRun(db, runId)
  assert.ok(row)
  queueInterruptedRunningSettle(row)
  const events: Array<{ type: string; code?: string; turn?: { workflow: string; attention: string } }> = []
  emitQueuedInterruptedRunning({
    isDestroyed: () => false,
    webContents: {
      send(_ch: string, event: { type: string; code?: string; turn?: { workflow: string; attention: string } }) {
        events.push(event)
      }
    }
  } as unknown as BrowserWindow)
  const workflow = (
    db.prepare("SELECT workflow_status as workflow FROM sessions WHERE id = ?").get(sessionId) as {
      workflow: string | null
    }
  ).workflow
  assert.equal(workflow, "needs_review")
  const assistant = db
    .prepare("SELECT content FROM messages WHERE session_id = ? AND role = 'assistant' ORDER BY created_at DESC LIMIT 1")
    .get(sessionId) as { content: string }
  const tool = parseAssistantPayload(assistant.content).tools?.[0]
  assert.equal(tool?.state, "output-error")
  assert.equal((tool?.result as { code?: string } | undefined)?.code, RESTART_ABANDONED_CODE)
  assert.ok(
    events.some(
      (event) =>
        event.type === "run.error" &&
        event.code === RESTORE_INTERRUPTED_RUNNING &&
        event.turn?.workflow === "needs_review" &&
        event.turn.attention === "neutral"
    )
  )
})

test("只读中途结清：不进待验收", () => {
  resetInterruptedRunningForTest()
  const sessionId = "ses_int_read"
  const runId = "run_int_read"
  seedSession({ workspaceId: "ws_int_read", sessionId })
  const db = getDatabase()
  persistMessage(sessionId, "user", "read it")
  persistMessage(
    sessionId,
    "assistant",
    serializeAssistantPayload({
      content: "",
      tools: [{ id: "tool_read", name: "read_file", state: "output-available", args: { path: "a.ts" } }]
    })
  )
  insertRun(db, {
    id: runId,
    sessionId,
    workspaceId: "ws_int_read",
    kind: "agent",
    status: "running",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  const row = getRun(db, runId)
  assert.ok(row)
  queueInterruptedRunningSettle(row)
  const workflow = (
    db.prepare("SELECT workflow_status as workflow FROM sessions WHERE id = ?").get(sessionId) as {
      workflow: string | null
    }
  ).workflow
  assert.equal(workflow, "in_progress")
})

test("标题 / 补全终态清掉 runs.checkpoint", () => {
  const generation = readFileSync(join(dir, "ai-generation.ts"), "utf8")
  assert.match(generation, /status: "completed", checkpoint: null/)
  assert.match(generation, /status: "failed".*checkpoint: null/)
})
