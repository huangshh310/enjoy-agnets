/**
 * 启动回挂：没检查点则结清停止；HMAC+检查点+签参才回挂可决策卡。
 */
import assert from "node:assert/strict"
import { existsSync, mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import type { BrowserWindow } from "electron"
import { insertRun } from "@enjoy-agents/db"

const {
  APPROVAL_RESTART_REASON,
  getApproval,
  getDatabase,
  getRun,
  listLivePendingApprovals,
  rememberApproval,
  resetRestoreWaitingOnceForTests,
  restoreWaitingRuns,
  RESTORE_NO_MATCHING_CODE,
  RESTART_UNVERIFIABLE_DECISION,
  deleteActiveRun,
  getActiveRun,
  overrideRestoreDesktopActAllowForTest,
  setApprovalDecision,
  setApprovalSdkResponse
} = await import("./restore-waiting-runs.behavior.load.ts")

type SentEvent = { type: string; approvalId?: string; code?: string; message?: string }

function recordWindow(events: SentEvent[]): BrowserWindow {
  return {
    isDestroyed: () => false,
    webContents: {
      send(_ch: string, event: SentEvent) {
        events.push(event)
      }
    }
  } as unknown as BrowserWindow
}

function seedWaiting(input: {
  runId: string
  sessionId: string
  workspaceId: string
  approvalId: string
  checkpoint: string | null
}): void {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(input.workspaceId, "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(input.sessionId, input.workspaceId, "restart", 1, 1)
  insertRun(db, {
    id: input.runId,
    sessionId: input.sessionId,
    workspaceId: input.workspaceId,
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    checkpoint: input.checkpoint,
    error: null
  })
  const plan = rememberApproval({
    runId: input.runId,
    approvalId: input.approvalId,
    toolCallId: `tool_${input.approvalId}`,
    name: "write_file",
    args: { path: "note.txt", content: "from stub" }
  })
  if (plan.action !== "insert" && plan.action !== "reuse") {
    throw new Error(`rememberApproval failed: ${plan.action}`)
  }
}

function waitingCheckpoint(input: { sessionId: string; approvalId: string }): string {
  return JSON.stringify({
    version: 1,
    request: {
      kind: "agent",
      sessionId: input.sessionId,
      modelId: "m",
      messages: [{ role: "user", content: "please write a note" }]
    },
    pendingApprovals: [
      { approvalId: input.approvalId, toolCallId: `tool_${input.approvalId}`, name: "write_file" }
    ]
  })
}

test("模拟重启无检查点：未决 cancelled(restart)，run 停止，Inbox 空", async () => {
  resetRestoreWaitingOnceForTests()
  const runId = "run_restart_nocheck"
  const sessionId = "ses_restart_nocheck"
  const approvalId = "apr_restart_nocheck"
  const events: SentEvent[] = []
  seedWaiting({
    runId,
    sessionId,
    workspaceId: "ws_restart_nocheck",
    approvalId,
    checkpoint: null
  })
  await restoreWaitingRuns(recordWindow(events))
  const stored = getApproval(getDatabase(), approvalId)
  assert.equal(stored?.decision, "cancelled")
  assert.equal(stored?.sdkReason, APPROVAL_RESTART_REASON)
  assert.equal(getRun(getDatabase(), runId)?.status, "cancelled")
  assert.equal(getRun(getDatabase(), runId)?.error, RESTORE_NO_MATCHING_CODE)
  assert.equal(getActiveRun(runId), undefined)
  assert.ok(!listLivePendingApprovals(getDatabase()).some((item) => item.id === approvalId))
  assert.ok(
    events.some(
      (event) => event.type === "run.error" && event.code === RESTORE_NO_MATCHING_CODE
    )
  )
  assert.equal(events.some((event) => event.type === "approval.required"), false)
})

test("模拟重启有检查点：HMAC+签参回挂可决策卡，Inbox 仍有活行", async () => {
  resetRestoreWaitingOnceForTests()
  const runId = "run_restart_ckpt"
  const sessionId = "ses_restart_ckpt"
  const approvalId = "apr_restart_ckpt"
  const events: SentEvent[] = []
  seedWaiting({
    runId,
    sessionId,
    workspaceId: "ws_restart_ckpt",
    approvalId,
    checkpoint: waitingCheckpoint({ sessionId, approvalId })
  })
  await restoreWaitingRuns(recordWindow(events))
  const stored = getApproval(getDatabase(), approvalId)
  assert.equal(stored?.decision ?? null, null)
  assert.equal(getRun(getDatabase(), runId)?.status, "waiting_review")
  assert.ok(events.some((event) => event.type === "approval.required" && event.approvalId === approvalId))
  assert.ok(listLivePendingApprovals(getDatabase()).some((item) => item.id === approvalId))
  assert.ok(getActiveRun(runId))
  deleteActiveRun(runId)
})

test("已决 allow + HMAC 通过：重启后工具真跑，不是 cancelled", async () => {
  resetRestoreWaitingOnceForTests()
  const root = mkdtempSync(join(tmpdir(), "enjoy-decided-allow-"))
  const runId = "run_decided_allow"
  const sessionId = "ses_decided_allow"
  const approvalId = "apr_decided_allow"
  const workspaceId = "ws_decided_allow"
  const events: SentEvent[] = []
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(workspaceId, "ws", root, 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, workspaceId, "decided", 1, 1)
  insertRun(db, {
    id: runId,
    sessionId,
    workspaceId,
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    checkpoint: waitingCheckpoint({ sessionId, approvalId }),
    error: null
  })
  const plan = rememberApproval({
    runId,
    approvalId,
    toolCallId: `tool_${approvalId}`,
    name: "write_file",
    args: { path: "note.txt", content: "from stub after allow" }
  })
  assert.ok(plan.action === "insert" || plan.action === "reuse")
  setApprovalDecision(db, approvalId, "allow")
  await restoreWaitingRuns(recordWindow(events))
  assert.equal(getApproval(db, approvalId)?.decision, "allow")
  assert.notEqual(getRun(db, runId)?.status, "cancelled")
  assert.equal(readFileSync(join(root, "note.txt"), "utf8"), "from stub after allow")
  assert.equal(existsSync(join(root, "note.txt")), true)
  deleteActiveRun(runId)
})

test("已决 deny + HMAC 通过：回放 approved:false 并续跑", async () => {
  resetRestoreWaitingOnceForTests()
  const runId = "run_decided_deny"
  const sessionId = "ses_decided_deny"
  const approvalId = "apr_decided_deny"
  const events: SentEvent[] = []
  seedWaiting({
    runId,
    sessionId,
    workspaceId: "ws_decided_deny",
    approvalId,
    checkpoint: waitingCheckpoint({ sessionId, approvalId })
  })
  const db = getDatabase()
  setApprovalDecision(db, approvalId, "deny")
  setApprovalSdkResponse(db, approvalId, { approved: false, reason: "user deny" })
  await restoreWaitingRuns(recordWindow(events))
  assert.equal(getApproval(db, approvalId)?.decision, "deny")
  assert.notEqual(getRun(db, runId)?.status, "cancelled")
  assert.ok(
    events.some(
      (event) => event.type === "tool.result" && event.approvalId !== approvalId
    ) ||
      events.some((event) => event.type === "tool.result")
  )
  const run = getActiveRun(runId)
  assert.ok(run)
  const last = run.messages.at(-1)
  const part = Array.isArray(last?.content) ? last.content[0] : undefined
  assert.equal((part as { approved?: boolean } | undefined)?.approved, false)
  deleteActiveRun(runId)
})

test("已决 allow + 篡 HMAC：cancelled，审计 restart_unverifiable_decision", async () => {
  resetRestoreWaitingOnceForTests()
  const runId = "run_hmac_decided"
  const sessionId = "ses_hmac_decided"
  const approvalId = "apr_hmac_decided"
  const events: SentEvent[] = []
  seedWaiting({
    runId,
    sessionId,
    workspaceId: "ws_hmac_decided",
    approvalId,
    checkpoint: waitingCheckpoint({ sessionId, approvalId })
  })
  const db = getDatabase()
  setApprovalDecision(db, approvalId, "allow")
  db.prepare("UPDATE approvals SET hmac = 'tampered' WHERE id = ?").run(approvalId)
  await restoreWaitingRuns(recordWindow(events))
  assert.equal(getRun(db, runId)?.status, "cancelled")
  assert.equal(getApproval(db, approvalId)?.sdkReason, RESTART_UNVERIFIABLE_DECISION)
  assert.equal(existsSync(join("/tmp", "note.txt")), false)
  assert.notEqual(getApproval(db, approvalId)?.decision, null)
})

test("desktop_act 已决 allow：不直接执行，走二次确认", async () => {
  resetRestoreWaitingOnceForTests()
  overrideRestoreDesktopActAllowForTest(async () => "second_confirm")
  try {
    const runId = "run_desktop_reverify"
    const sessionId = "ses_desktop_reverify"
    const approvalId = "apr_desktop_reverify"
    const events: SentEvent[] = []
    const db = getDatabase()
    db.prepare(
      "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).run("ws_desktop_reverify", "ws", "/tmp", 1, 1)
    db.prepare(
      "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).run(sessionId, "ws_desktop_reverify", "desktop", 1, 1)
    insertRun(db, {
      id: runId,
      sessionId,
      workspaceId: "ws_desktop_reverify",
      kind: "agent",
      status: "waiting_review",
      modelId: "m",
      providerId: null,
      checkpoint: JSON.stringify({
        version: 1,
        request: {
          kind: "agent",
          sessionId,
          modelId: "m",
          messages: [{ role: "user", content: "click notes" }]
        },
        pendingApprovals: [{ approvalId, toolCallId: `tool_${approvalId}`, name: "desktop_act" }]
      }),
      error: null
    })
    const plan = rememberApproval({
      runId,
      approvalId,
      toolCallId: `tool_${approvalId}`,
      name: "desktop_act",
      args: { action: "click", appName: "备忘录", observationId: "obs_1" }
    })
    assert.ok(plan.action === "insert" || plan.action === "reuse")
    setApprovalDecision(db, approvalId, "allow")
    await restoreWaitingRuns(recordWindow(events))
    assert.notEqual(getRun(db, runId)?.status, "cancelled")
    assert.ok(events.some((event) => event.type === "approval.required"))
    assert.ok(getActiveRun(runId))
    deleteActiveRun(runId)
  } finally {
    overrideRestoreDesktopActAllowForTest(null)
  }
})

test("desktop_act 已决 allow 且无法重拍：fail closed + 审计", async () => {
  resetRestoreWaitingOnceForTests()
  overrideRestoreDesktopActAllowForTest(async () => "unavailable")
  try {
    const runId = "run_desktop_unavail"
    const sessionId = "ses_desktop_unavail"
    const approvalId = "apr_desktop_unavail"
    const events: SentEvent[] = []
    const db = getDatabase()
    db.prepare(
      "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).run("ws_desktop_unavail", "ws", "/tmp", 1, 1)
    db.prepare(
      "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).run(sessionId, "ws_desktop_unavail", "desktop", 1, 1)
    insertRun(db, {
      id: runId,
      sessionId,
      workspaceId: "ws_desktop_unavail",
      kind: "agent",
      status: "waiting_review",
      modelId: "m",
      providerId: null,
      checkpoint: JSON.stringify({
        version: 1,
        request: {
          kind: "agent",
          sessionId,
          modelId: "m",
          messages: [{ role: "user", content: "click notes" }]
        },
        pendingApprovals: [{ approvalId, toolCallId: `tool_${approvalId}`, name: "desktop_act" }]
      }),
      error: null
    })
    const plan = rememberApproval({
      runId,
      approvalId,
      toolCallId: `tool_${approvalId}`,
      name: "desktop_act",
      args: { action: "click", appName: "备忘录" }
    })
    assert.ok(plan.action === "insert" || plan.action === "reuse")
    setApprovalDecision(db, approvalId, "allow")
    await restoreWaitingRuns(recordWindow(events))
    assert.equal(getRun(db, runId)?.status, "cancelled")
    assert.equal(getApproval(db, approvalId)?.sdkReason, RESTART_UNVERIFIABLE_DECISION)
    assert.equal(getActiveRun(runId), undefined)
  } finally {
    overrideRestoreDesktopActAllowForTest(null)
  }
})

test("desktop_act 已决 deny：回放 approved:false 并续跑", async () => {
  resetRestoreWaitingOnceForTests()
  const runId = "run_desktop_deny"
  const sessionId = "ses_desktop_deny"
  const approvalId = "apr_desktop_deny"
  const events: SentEvent[] = []
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_desktop_deny", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, "ws_desktop_deny", "desktop", 1, 1)
  insertRun(db, {
    id: runId,
    sessionId,
    workspaceId: "ws_desktop_deny",
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    checkpoint: JSON.stringify({
      version: 1,
      request: {
        kind: "agent",
        sessionId,
        modelId: "m",
        messages: [{ role: "user", content: "click notes" }]
      },
      pendingApprovals: [{ approvalId, toolCallId: `tool_${approvalId}`, name: "desktop_act" }]
    }),
    error: null
  })
  const plan = rememberApproval({
    runId,
    approvalId,
    toolCallId: `tool_${approvalId}`,
    name: "desktop_act",
    args: { action: "click", appName: "备忘录" }
  })
  assert.ok(plan.action === "insert" || plan.action === "reuse")
  setApprovalDecision(db, approvalId, "deny")
  setApprovalSdkResponse(db, approvalId, { approved: false, reason: "user deny" })
  await restoreWaitingRuns(recordWindow(events))
  assert.equal(getApproval(db, approvalId)?.decision, "deny")
  assert.notEqual(getRun(db, runId)?.status, "cancelled")
  const run = getActiveRun(runId)
  assert.ok(run)
  const last = run.messages.at(-1)
  const part = Array.isArray(last?.content) ? last.content[0] : undefined
  assert.equal((part as { approved?: boolean } | undefined)?.approved, false)
  deleteActiveRun(runId)
})
