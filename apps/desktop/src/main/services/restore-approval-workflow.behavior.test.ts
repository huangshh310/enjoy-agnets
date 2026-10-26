/**
 * 审批等待中重启 abandon：工单落库 + 工具封口后检查器不再转「进行中」。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"
import { insertRun } from "@enjoy-agents/db"
import { parseAssistantPayload, serializeAssistantPayload } from "@enjoy-agents/ipc-contract"
import { RESTART_ABANDONED_CODE, toolHasResultCode } from "@enjoy-agents/ipc-contract/desktop-notify"

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
  getActiveRun
} = await import("./restore-waiting-runs.behavior.load.ts")

const { persistMessage } = await import("./persist-session.ts")

type SentEvent = { type: string; code?: string; turn?: { workflow?: string } }

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

function seedApprovalWaiting(input: {
  runId: string
  sessionId: string
  workspaceId: string
  approvalId: string
  withToolRow: boolean
}): void {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(input.workspaceId, "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(input.sessionId, input.workspaceId, "apr-restart", 1, 1)
  db.prepare("UPDATE sessions SET workflow_status = ? WHERE id = ?").run("in_progress", input.sessionId)
  insertRun(db, {
    id: input.runId,
    sessionId: input.sessionId,
    workspaceId: input.workspaceId,
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    checkpoint: null,
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
  if (!input.withToolRow) return
  persistMessage(input.sessionId, "user", "please write a note")
  persistMessage(
    input.sessionId,
    "assistant",
    serializeAssistantPayload({
      content: "",
      runId: input.runId,
      tools: [
        {
          id: `tool_${input.approvalId}`,
          name: "write_file",
          state: "approval-requested",
          args: { path: "note.txt", content: "from stub" }
        }
      ]
    })
  )
}

test("abandon 后：工单 todo、Inbox 空、工具封口 → 检查器 kind=restart 不是 running", async () => {
  resetRestoreWaitingOnceForTests()
  resetApprovalSecretForTest()
  const runId = "run_apr_wf"
  const sessionId = "ses_apr_wf"
  const approvalId = "apr_apr_wf"
  const events: SentEvent[] = []
  seedApprovalWaiting({
    runId,
    sessionId,
    workspaceId: "ws_apr_wf",
    approvalId,
    withToolRow: true
  })
  await restoreWaitingRuns(recordWindow(events))
  assert.equal(getApproval(getDatabase(), approvalId)?.decision, "cancelled")
  assert.equal(getApproval(getDatabase(), approvalId)?.sdkReason, APPROVAL_RESTART_REASON)
  assert.equal(getRun(getDatabase(), runId)?.status, "cancelled")
  assert.equal(getRun(getDatabase(), runId)?.error, RESTORE_NO_MATCHING_CODE)
  assert.equal(getActiveRun(runId), undefined)
  assert.ok(!listLivePendingApprovals(getDatabase()).some((item) => item.id === approvalId))
  const workflow = (
    getDatabase()
      .prepare("SELECT workflow_status as w FROM sessions WHERE id = ?")
      .get(sessionId) as { w: string | null }
  ).w
  assert.equal(workflow, "todo")
  assert.ok(events.some((event) => event.type === "run.error" && event.turn?.workflow === "todo"))
  const assistant = getDatabase()
    .prepare(
      "SELECT content FROM messages WHERE session_id = ? AND role = 'assistant' ORDER BY created_at DESC LIMIT 1"
    )
    .get(sessionId) as { content: string }
  const tool = parseAssistantPayload(assistant.content).tools?.[0]
  assert.ok(tool)
  assert.equal(tool.state, "output-error")
  const result = tool.result && typeof tool.result === "object" ? (tool.result as Record<string, unknown>) : {}
  assert.equal(result.code, RESTART_ABANDONED_CODE)
  assert.equal(toolHasResultCode(tool, RESTART_ABANDONED_CODE), true, "检查器凭 restart_abandoned 标 restart，不得再转圈")
})

test("源码：endRestoredRunWithoutSdkReply 必须 persistTurnWorkflow", async () => {
  const { readFileSync } = await import("node:fs")
  const src = readFileSync(new URL("./restore-checkpoint-approval.ts", import.meta.url), "utf8")
  assert.match(src, /persistTurnWorkflow\(sid, turn\)/)
  assert.match(src, /workflow:\s*"todo"/)
})
