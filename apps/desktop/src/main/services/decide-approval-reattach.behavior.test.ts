/**
 * 回挂未挂上时点允许走 approval_not_reattached；其它失败保持原句。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"
import { insertRun } from "@enjoy-agents/db"
import { APPROVAL_NOT_REATTACHED, ASK_USER_QUESTIONS_TOOL } from "@enjoy-agents/ipc-contract"

const {
  decideApproval,
  deleteActiveRun,
  getDatabase,
  holdAgentRun,
  markRestoreWaitingSettled,
  rememberApproval,
  resetRestoreWaitingOnceForTests
} = await import("./decide-approval-reattach.behavior.load.ts")

function silentWindow(): BrowserWindow {
  return {
    isDestroyed: () => false,
    webContents: { send() {} }
  } as unknown as BrowserWindow
}

function seedWaitingRun(runId: string, sessionId: string, workspaceId: string): void {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(workspaceId, "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, workspaceId, "wait", 1, 1)
  insertRun(db, {
    id: runId,
    sessionId,
    workspaceId,
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
}

test("回挂未完成时点允许抛 approval_not_reattached", async () => {
  resetRestoreWaitingOnceForTests()
  seedWaitingRun("run_not_ready", "ses_not_ready", "ws_not_ready")
  await assert.rejects(
    () =>
      decideApproval(silentWindow(), {
        runId: "run_not_ready",
        toolCallId: "tool_not_ready",
        approvalId: "apr_not_ready",
        decision: "allow"
      }),
    (error: unknown) => error instanceof Error && error.message === APPROVAL_NOT_REATTACHED
  )
})

test("回挂完成后 run 已不在内存：写出 run no longer active", async () => {
  resetRestoreWaitingOnceForTests()
  markRestoreWaitingSettled()
  await assert.rejects(
    () =>
      decideApproval(silentWindow(), {
        runId: "run_gone",
        toolCallId: "tool_gone",
        approvalId: "apr_gone",
        decision: "allow"
      }),
    /This agent run is no longer active/
  )
})

test("提问工具 allow_session 保持原句", async () => {
  resetRestoreWaitingOnceForTests()
  markRestoreWaitingSettled()
  rememberApproval({
    runId: "run_ask",
    approvalId: "apr_ask",
    toolCallId: "tool_ask",
    name: ASK_USER_QUESTIONS_TOOL,
    args: { questions: [{ id: "q1", prompt: "ok?" }] }
  })
  holdAgentRun({
    runId: "run_ask",
    window: silentWindow(),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId: "ses_ask",
      workspaceId: "ws_ask",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "ask" }]
    }
  })
  const run = (await import("./agent-run-state.ts")).getActiveRun("run_ask")
  run?.pendingApprovals.push({
    approvalId: "apr_ask",
    toolCallId: "tool_ask",
    name: ASK_USER_QUESTIONS_TOOL,
    args: { questions: [{ id: "q1", prompt: "ok?" }] }
  })
  await assert.rejects(
    () =>
      decideApproval(silentWindow(), {
        runId: "run_ask",
        toolCallId: "tool_ask",
        approvalId: "apr_ask",
        decision: "allow_session"
      }),
    /ask_user_questions cannot be allow_session/
  )
  deleteActiveRun("run_ask")
})
