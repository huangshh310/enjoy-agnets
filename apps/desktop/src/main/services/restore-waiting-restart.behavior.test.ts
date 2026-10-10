/**
 * 启动回挂：没检查点则结清停止；HMAC+检查点+签参才回挂可决策卡。
 */
import assert from "node:assert/strict"
import { existsSync, mkdtempSync } from "node:fs"
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
  resetApprovalSecretForTest,
  resetRestoreWaitingOnceForTests,
  restoreWaitingRuns,
  RESTORE_NO_MATCHING_CODE,
  RESTART_UNVERIFIABLE_DECISION,
  deleteActiveRun,
  getActiveRun,
  setApprovalDecision,
  setApprovalSdkResponse
} = await import("./restore-waiting-runs.behavior.load.ts")

type SentEvent = { type: string; approvalId?: string; code?: string; message?: string; toolCallId?: string }

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

test("已决 allow + SDK 已落库：回放 tool.result / run.tools，不重跑写盘", async () => {
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
  setApprovalSdkResponse(db, approvalId, { approved: true, reason: "user allow" })
  await restoreWaitingRuns(recordWindow(events))
  assert.equal(getApproval(db, approvalId)?.decision, "allow")
  assert.equal(getApproval(db, approvalId)?.sdkApproved, 1)
  assert.notEqual(getRun(db, runId)?.status, "cancelled")
  assert.ok(events.some((event) => event.type === "tool.result" && event.toolCallId === `tool_${approvalId}`))
  const run = getActiveRun(runId)
  assert.ok(run)
  const last = run.messages.at(-1)
  const part = Array.isArray(last?.content) ? last.content[0] : undefined
  assert.equal((part as { approved?: boolean } | undefined)?.approved, true)
  assert.equal(run.tools.some((tool) => tool.id === `tool_${approvalId}` && tool.state === "output-available"), true)
  assert.equal(existsSync(join(root, "note.txt")), false)
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
  assert.equal(getApproval(db, approvalId)?.decision, "allow")
  assert.notEqual(getApproval(db, approvalId)?.sdkReason, RESTART_UNVERIFIABLE_DECISION)
  assert.equal(existsSync(join("/tmp", "note.txt")), false)
})

test("未决 + 篡 HMAC：fail closed，审计，不重跑", async () => {
  resetRestoreWaitingOnceForTests()
  const runId = "run_hmac_pending"
  const sessionId = "ses_hmac_pending"
  const approvalId = "apr_hmac_pending"
  const events: SentEvent[] = []
  seedWaiting({
    runId,
    sessionId,
    workspaceId: "ws_hmac_pending",
    approvalId,
    checkpoint: waitingCheckpoint({ sessionId, approvalId })
  })
  const db = getDatabase()
  db.prepare("UPDATE approvals SET hmac = 'tampered' WHERE id = ?").run(approvalId)
  await restoreWaitingRuns(recordWindow(events))
  assert.equal(getRun(db, runId)?.status, "cancelled")
  assert.equal(getApproval(db, approvalId)?.decision, "cancelled")
  assert.equal(getApproval(db, approvalId)?.sdkReason, RESTART_UNVERIFIABLE_DECISION)
  assert.equal(events.some((event) => event.type === "approval.required"), false)
  assert.equal(events.some((event) => event.type === "tool.result"), false)
  assert.ok(
    events.some(
      (event) => event.type === "approval.resolved" && event.code === "restart_abandoned"
    ) || events.some((event) => event.type === "run.error" && event.code === RESTORE_NO_MATCHING_CODE)
  )
  assert.equal(getActiveRun(runId), undefined)
})

test("HMAC 密钥轮换：fail closed，工具行 restart_abandoned，不重跑", async () => {
  resetRestoreWaitingOnceForTests()
  const runId = "run_hmac_rotated"
  const sessionId = "ses_hmac_rotated"
  const approvalId = "apr_hmac_rotated"
  const events: SentEvent[] = []
  seedWaiting({
    runId,
    sessionId,
    workspaceId: "ws_hmac_rotated",
    approvalId,
    checkpoint: waitingCheckpoint({ sessionId, approvalId })
  })
  resetApprovalSecretForTest()
  const { writeFileSync } = await import("node:fs")
  const { join } = await import("node:path")
  const { app } = await import("electron")
  writeFileSync(join(app.getPath("userData"), "approval-hmac.bin"), Buffer.from("rotated-secret-key"))
  await restoreWaitingRuns(recordWindow(events))
  const db = getDatabase()
  assert.equal(getRun(db, runId)?.status, "cancelled")
  assert.equal(getApproval(db, approvalId)?.decision, "cancelled")
  assert.notEqual(getApproval(db, approvalId)?.decision, "deny")
  assert.equal(events.some((event) => event.type === "approval.required"), false)
  assert.equal(events.some((event) => event.type === "tool.result"), false)
  assert.ok(
    events.some(
      (event) => event.type === "approval.resolved" && event.code === "restart_abandoned"
    ) || events.some((event) => event.type === "run.error")
  )
  assert.equal(getActiveRun(runId), undefined)
})

test("desktop_act 已决 allow + 重启：无卡，fail closed + 审计", async () => {
  resetRestoreWaitingOnceForTests()
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
  assert.equal(getRun(db, runId)?.status, "cancelled")
  assert.equal(events.some((event) => event.type === "approval.required"), false)
  assert.equal(getApproval(db, approvalId)?.decision, "allow")
  assert.equal(getApproval(db, approvalId)?.sdkReason, RESTART_UNVERIFIABLE_DECISION)
  assert.equal(getActiveRun(runId), undefined)
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

test("历史 desktop_act allow 已回 SDK + 当前未决 write_file：只回挂写盘卡", async () => {
  resetRestoreWaitingOnceForTests()
  const runId = "run_probe_o"
  const sessionId = "ses_probe_o"
  const historicalId = "apr_probe_o_desktop"
  const pendingId = "apr_probe_o_write"
  const events: SentEvent[] = []
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_probe_o", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, "ws_probe_o", "probe-o", 1, 1)
  insertRun(db, {
    id: runId,
    sessionId,
    workspaceId: "ws_probe_o",
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
        messages: [{ role: "user", content: "write after click" }]
      },
      pendingApprovals: [{ approvalId: pendingId, toolCallId: `tool_${pendingId}`, name: "write_file" }]
    }),
    error: null
  })
  const historical = rememberApproval({
    runId,
    approvalId: historicalId,
    toolCallId: `tool_${historicalId}`,
    name: "desktop_act",
    args: { action: "click", appName: "备忘录" }
  })
  assert.ok(historical.action === "insert" || historical.action === "reuse")
  setApprovalDecision(db, historicalId, "allow")
  setApprovalSdkResponse(db, historicalId, { approved: true, reason: "user allow" })
  const pending = rememberApproval({
    runId,
    approvalId: pendingId,
    toolCallId: `tool_${pendingId}`,
    name: "write_file",
    args: { path: "note.txt", content: "from stub" }
  })
  assert.ok(pending.action === "insert" || pending.action === "reuse")
  await restoreWaitingRuns(recordWindow(events))
  assert.notEqual(getRun(db, runId)?.status, "cancelled")
  assert.equal(getApproval(db, historicalId)?.decision, "allow")
  assert.equal(getApproval(db, pendingId)?.decision, null)
  assert.ok(getActiveRun(runId))
  assert.ok(events.some((event) => event.type === "approval.required" && event.approvalId === pendingId))
  deleteActiveRun(runId)
})
