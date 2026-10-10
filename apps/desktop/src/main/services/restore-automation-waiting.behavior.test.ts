/**
 * 自动化 / 补跑 waiting 回挂：与用户同一套规则；本会话允许重启后作废。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"
import { insertRun } from "@enjoy-agents/db"

const {
  getActiveRun,
  getApproval,
  getDatabase,
  getRun,
  grantConversationToolAllow,
  listLivePendingApprovals,
  rememberApproval,
  resetApprovalSecretForTest,
  resetRestoreWaitingOnceForTests,
  restoreWaitingRuns,
  RESTORE_NO_MATCHING_CODE,
  deleteActiveRun,
  clearAllConversationSessionAllows
} = await import("./restore-automation-waiting.behavior.load.ts")

type SentEvent = {
  type: string
  runId?: string
  approvalId?: string
  code?: string
  turn?: { attention?: string }
}

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
  ).run(input.sessionId, input.workspaceId, "测试写入", 1, 1)
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
    args: { path: "note.txt", content: "from auto" }
  })
  if (plan.action !== "insert" && plan.action !== "reuse") {
    throw new Error(`rememberApproval failed: ${plan.action}`)
  }
}

function waitingCheckpoint(input: {
  sessionId: string
  approvalId: string
  origin?: string
  automationSource?: unknown
}): string {
  return JSON.stringify({
    version: 1,
    request: {
      kind: "agent",
      sessionId: input.sessionId,
      modelId: "m",
      messages: [{ role: "user", content: "测试写入" }]
    },
    pendingApprovals: [
      { approvalId: input.approvalId, toolCallId: `tool_${input.approvalId}`, name: "write_file" }
    ],
    origin: input.origin,
    automationSource: input.automationSource
  })
}

test.beforeEach(() => {
  resetRestoreWaitingOnceForTests()
  resetApprovalSecretForTest()
  clearAllConversationSessionAllows()
})

test("自动化立即运行有检查点：回挂发卡，origin=automation，不吃本会话允许", async () => {
  const runId = "run_auto_wait"
  const sessionId = "ses_auto_wait"
  const approvalId = "apr_auto_wait"
  grantConversationToolAllow(sessionId, "write_file")
  const events: SentEvent[] = []
  seedWaiting({
    runId,
    sessionId,
    workspaceId: "ws_auto_wait",
    approvalId,
    checkpoint: waitingCheckpoint({
      sessionId,
      approvalId,
      origin: "automation",
      automationSource: {
        automationId: "auto_1",
        automationName: "手动写入",
        startedAt: 1,
        isCatchUp: false
      }
    })
  })
  clearAllConversationSessionAllows()
  await restoreWaitingRuns(recordWindow(events))
  const run = getActiveRun(runId)
  assert.ok(run)
  assert.equal(run.input.origin, "automation")
  assert.equal(run.sessionApprovedTools.has("write_file"), false)
  assert.equal(getApproval(getDatabase(), approvalId)?.decision ?? null, null)
  assert.ok(events.some((event) => event.type === "approval.required" && event.approvalId === approvalId))
  assert.ok(listLivePendingApprovals(getDatabase()).some((item) => item.id === approvalId))
  deleteActiveRun(runId)
})

test("用户检查点 origin 才是 user；缺 origin 有 automationSource 也不是 user", async () => {
  const userEvents: SentEvent[] = []
  seedWaiting({
    runId: "run_user_origin",
    sessionId: "ses_user_origin",
    workspaceId: "ws_user_origin",
    approvalId: "apr_user_origin",
    checkpoint: waitingCheckpoint({
      sessionId: "ses_user_origin",
      approvalId: "apr_user_origin",
      origin: "user"
    })
  })
  await restoreWaitingRuns(recordWindow(userEvents))
  assert.equal(getActiveRun("run_user_origin")?.input.origin, "user")
  deleteActiveRun("run_user_origin")

  resetRestoreWaitingOnceForTests()
  const autoEvents: SentEvent[] = []
  seedWaiting({
    runId: "run_infer_auto",
    sessionId: "ses_infer_auto",
    workspaceId: "ws_infer_auto",
    approvalId: "apr_infer_auto",
    checkpoint: waitingCheckpoint({
      sessionId: "ses_infer_auto",
      approvalId: "apr_infer_auto",
      automationSource: {
        automationId: "auto_2",
        automationName: "推断",
        scheduledAt: 2,
        isCatchUp: false
      }
    })
  })
  await restoreWaitingRuns(recordWindow(autoEvents))
  assert.equal(getActiveRun("run_infer_auto")?.input.origin, "automation")
  deleteActiveRun("run_infer_auto")
})

test("自动化 waiting 无检查点：fail closed，Inbox 空，不是死卡", async () => {
  const runId = "run_auto_dead"
  const sessionId = "ses_auto_dead"
  const approvalId = "apr_auto_dead"
  const events: SentEvent[] = []
  seedWaiting({
    runId,
    sessionId,
    workspaceId: "ws_auto_dead",
    approvalId,
    checkpoint: null
  })
  await restoreWaitingRuns(recordWindow(events))
  assert.equal(getActiveRun(runId), undefined)
  assert.equal(getRun(getDatabase(), runId)?.status, "cancelled")
  assert.equal(getRun(getDatabase(), runId)?.error, RESTORE_NO_MATCHING_CODE)
  assert.equal(getApproval(getDatabase(), approvalId)?.decision, "cancelled")
  assert.equal(listLivePendingApprovals(getDatabase()).some((item) => item.id === approvalId), false)
  assert.equal(
    events.some((event) => event.type === "approval.required" && event.approvalId === approvalId),
    false
  )
  const abandoned = events.find((event) => event.type === "run.error" && event.runId === runId)
  assert.ok(abandoned)
  assert.equal(abandoned.code, RESTORE_NO_MATCHING_CODE)
  assert.equal(abandoned.turn?.attention, "neutral")
})

test("重启后内存本会话允许表已空：用户回挂卡仍要再问", async () => {
  const runId = "run_session_allow_restart"
  const sessionId = "ses_session_allow_restart"
  const approvalId = "apr_session_allow_restart"
  grantConversationToolAllow(sessionId, "write_file")
  seedWaiting({
    runId,
    sessionId,
    workspaceId: "ws_session_allow_restart",
    approvalId,
    checkpoint: waitingCheckpoint({ sessionId, approvalId, origin: "user" })
  })
  clearAllConversationSessionAllows()
  const events: SentEvent[] = []
  await restoreWaitingRuns(recordWindow(events))
  const run = getActiveRun(runId)
  assert.ok(run)
  assert.equal(run.input.origin, "user")
  assert.equal(run.sessionApprovedTools.has("write_file"), false)
  assert.ok(events.some((event) => event.type === "approval.required" && event.approvalId === approvalId))
  deleteActiveRun(runId)
})
