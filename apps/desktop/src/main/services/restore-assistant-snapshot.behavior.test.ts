/**
 * Probe S：回挂不得拿上一轮助手行盖掉。waiting / running 两条路都过。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import type { BrowserWindow } from "electron"
import { fileURLToPath } from "node:url"
import { insertRun, getRun } from "@enjoy-agents/db"
import { parseAssistantPayload, serializeAssistantPayload } from "@enjoy-agents/ipc-contract"

const runningSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "restore-running-runs.ts"),
  "utf8"
)

const {
  deleteActiveRun,
  getActiveRun,
  getDatabase,
  persistFinishedAssistant,
  persistMessage,
  queueInterruptedRunningSettle,
  readLatestAssistantSnapshot,
  canReuseAssistantRow,
  rememberApproval,
  resetInterruptedRunningForTest,
  resetRestoreWaitingOnceForTests,
  restoreWaitingRuns
} = await import("./restore-assistant-snapshot.behavior.load.ts")

function seedWorkspace(sessionId: string, workspaceId: string): void {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(workspaceId, "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, workspaceId, "probe-s", 1, 1)
}

function insertTurn(sessionId: string, at: number, role: "user" | "assistant", content: string): string {
  const id = `msg_${sessionId}_${role}_${at}`
  getDatabase()
    .prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, sessionId, role, content, at)
  return id
}

const previousAssistant = serializeAssistantPayload({
  content: "old reply",
  tools: [{ id: "tool_old", name: "read_file", state: "output-available", args: { path: "old.ts" } }]
})

test("最新助手早于本轮用户句：不复用，waiting / running 都不盖上一轮", async () => {
  resetRestoreWaitingOnceForTests()
  resetInterruptedRunningForTest()
  const db = getDatabase()
  const waitingSession = "ses_probe_s_wait"
  const runningSession = "ses_probe_s_run"
  seedWorkspace(waitingSession, "ws_probe_s_wait")
  seedWorkspace(runningSession, "ws_probe_s_run")
  insertTurn(waitingSession, 10, "user", "first")
  const oldWait = insertTurn(waitingSession, 20, "assistant", previousAssistant)
  insertTurn(waitingSession, 30, "user", "second")
  insertTurn(runningSession, 10, "user", "first")
  const oldRun = insertTurn(runningSession, 20, "assistant", previousAssistant)
  insertTurn(runningSession, 30, "user", "second")

  insertRun(db, {
    id: "run_probe_s_wait",
    sessionId: waitingSession,
    workspaceId: "ws_probe_s_wait",
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    createdAt: 40,
    checkpoint: JSON.stringify({
      version: 1,
      request: {
        kind: "agent",
        sessionId: waitingSession,
        modelId: "m",
        messages: [{ role: "user", content: "second" }]
      },
      pendingApprovals: [{ approvalId: "apr_probe_s_wait", toolCallId: "tool_probe_s_wait", name: "write_file" }]
    }),
    error: null
  })
  rememberApproval({
    runId: "run_probe_s_wait",
    approvalId: "apr_probe_s_wait",
    toolCallId: "tool_probe_s_wait",
    name: "write_file",
    args: { path: "note.txt", content: "from stub" }
  })

  insertRun(db, {
    id: "run_probe_s_run",
    sessionId: runningSession,
    workspaceId: "ws_probe_s_run",
    kind: "agent",
    status: "running",
    modelId: "m",
    providerId: null,
    createdAt: 40,
    checkpoint: null,
    error: null
  })

  const waitSnap = readLatestAssistantSnapshot(waitingSession, { runCreatedAt: 40 })
  const runSnap = readLatestAssistantSnapshot(runningSession, { runCreatedAt: 40 })
  assert.equal(waitSnap.assistantPersisted, false)
  assert.equal(waitSnap.assistantMessageId, undefined)
  assert.deepEqual(waitSnap.tools, [])
  assert.equal(runSnap.assistantPersisted, false)
  assert.equal(runSnap.assistantMessageId, undefined)

  await restoreWaitingRuns({
    isDestroyed: () => false,
    webContents: { send() {} }
  } as unknown as BrowserWindow)
  const held = getActiveRun("run_probe_s_wait")
  assert.ok(held)
  assert.equal(held.assistantPersisted, false)
  assert.equal(held.assistantMessageId, undefined)
  assert.equal(
    (db.prepare("SELECT content FROM messages WHERE id = ?").get(oldWait) as { content: string }).content,
    previousAssistant
  )
  deleteActiveRun("run_probe_s_wait")

  const runningRow = getRun(db, "run_probe_s_run")
  assert.ok(runningRow)
  queueInterruptedRunningSettle(runningRow)
  assert.equal(
    (db.prepare("SELECT content FROM messages WHERE id = ?").get(oldRun) as { content: string }).content,
    previousAssistant
  )
  const oldTools = parseAssistantPayload(previousAssistant).tools
  assert.equal(oldTools?.[0]?.state, "output-available")
  assert.match(
    runningSrc,
    /readLatestAssistantSnapshot\(row\.sessionId, \{ runCreatedAt: row\.createdAt, runId: row\.id \}\)/
  )
})

test("本轮用户句之后的助手：复用同一行", () => {
  const sessionId = "ses_probe_s_reuse"
  seedWorkspace(sessionId, "ws_probe_s_reuse")
  persistMessage(sessionId, "user", "write now")
  const assistantId = persistMessage(
    sessionId,
    "assistant",
    serializeAssistantPayload({
      content: "",
      tools: [{ id: "t1", name: "write_file", state: "approval-requested", args: { path: "a.ts" } }]
    })
  )
  const snap = readLatestAssistantSnapshot(sessionId, { runCreatedAt: 1 })
  assert.equal(snap.assistantPersisted, true)
  assert.equal(snap.assistantMessageId, assistantId)
  assert.equal(snap.tools[0]?.id, "t1")
})

const sealedRestart = serializeAssistantPayload({
  content: "",
  runId: "run_old",
  tools: [
    {
      id: "tool_stub_1",
      name: "write_file",
      state: "output-error",
      args: { path: "e2e-stub.txt" },
      result: { code: "restart_abandoned", decision: "cancelled" }
    }
  ]
})

test("restart_abandoned 终态行：快照不复用，persist 新插行", () => {
  const sessionId = "ses_probe_s_terminal"
  seedWorkspace(sessionId, "ws_probe_s_terminal")
  persistMessage(sessionId, "user", "please write a note")
  const oldId = persistMessage(sessionId, "assistant", sealedRestart)
  assert.equal(canReuseAssistantRow(sealedRestart, "run_new"), false)
  const snap = readLatestAssistantSnapshot(sessionId, { runCreatedAt: 1 })
  assert.equal(snap.assistantPersisted, false)
  assert.equal(snap.assistantMessageId, undefined)
  const freshId = persistFinishedAssistant({
    sessionId,
    content: "",
    reasoning: "",
    tools: [
      {
        id: "tool_stub_1",
        name: "write_file",
        state: "output-available",
        args: { path: "e2e-stub.txt" },
        result: { ok: true }
      }
    ],
    startedAt: Date.now(),
    extras: {},
    runKind: "agent",
    runId: "run_new",
    messageId: oldId
  })
  assert.ok(freshId)
  assert.notEqual(freshId, oldId)
  assert.equal(
    (getDatabase().prepare("SELECT content FROM messages WHERE id = ?").get(oldId) as { content: string })
      .content,
    sealedRestart
  )
  const fresh = parseAssistantPayload(
    (getDatabase().prepare("SELECT content FROM messages WHERE id = ?").get(freshId) as { content: string })
      .content
  )
  assert.equal(fresh.runId, "run_new")
  assert.equal(fresh.tools?.[0]?.state, "output-available")
})
