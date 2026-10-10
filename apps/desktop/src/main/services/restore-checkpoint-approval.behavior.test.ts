/**
 * 重启回挂：检查点 pending 对不上 HMAC 未决表时的四支行为。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"

const {
  applyRestoredOrphanApprovals,
  deleteActiveRun,
  getActiveRun,
  getApproval,
  getDatabase,
  getRun,
  holdAgentRun,
  insertApproval,
  insertRun,
  RESTORE_NO_MATCHING_APPROVAL,
  resolveRestoredOrphanApproval,
  supersededSdkApprovalId
} = await import("./restore-checkpoint-approval.behavior.load.ts")

type SentEvent = { type: string; approvalId?: string; message?: string }

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

function seedRun(runId: string, sessionId: string): void {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_restore_orphan", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, "ws_restore_orphan", "restore", 1, 1)
  try {
    insertRun(db, {
      id: runId,
      sessionId,
      workspaceId: "ws_restore_orphan",
      kind: "agent",
      status: "waiting_review",
      modelId: "m",
      providerId: null,
      checkpoint: null,
      error: null
    })
  } catch {
    // 同行已在
  }
}

function hold(runId: string, sessionId: string, events: SentEvent[]): void {
  seedRun(runId, sessionId)
  holdAgentRun({
    runId,
    window: recordWindow(events),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId,
      workspaceId: "ws_restore_orphan",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "write" }]
    }
  })
}

test("已决行：getApproval 后回放用 sdk_approval_id，不是内部 id", () => {
  const db = getDatabase()
  insertApproval(db, {
    id: "apr_internal_lookup",
    runId: "run_lookup",
    toolCallId: "tool_lookup",
    name: "write_file",
    args: "{}",
    hmac: "h",
    decision: "deny",
    createdAt: Date.now(),
    sdkApproved: 0,
    sdkReason: "user deny",
    sdkApprovalId: "apr_sdk_lookup"
  })
  const resolved = resolveRestoredOrphanApproval(db, "apr_internal_lookup")
  assert.equal(resolved.kind, "replay")
  if (resolved.kind !== "replay") return
  assert.equal(resolved.sdkApprovalId, "apr_sdk_lookup")
  assert.notEqual(resolved.sdkApprovalId, "apr_internal_lookup")
  assert.equal(getApproval(db, "apr_internal_lookup")?.id, "apr_internal_lookup")
})

test("已决行：回放库里存的 SDK response", () => {
  const events: SentEvent[] = []
  const runId = "run_replay_stored"
  hold(runId, "ses_replay_stored", events)
  insertApproval(getDatabase(), {
    id: "apr_internal_replay",
    runId,
    toolCallId: "tool_replay",
    name: "write_file",
    args: "{}",
    hmac: "h",
    decision: "deny",
    createdAt: Date.now(),
    sdkApproved: 0,
    sdkReason: "already decided",
    sdkApprovalId: "apr_sdk_replay"
  })
  const applied = applyRestoredOrphanApprovals({
    runId,
    items: [{ approvalId: "apr_internal_replay", toolCallId: "tool_replay", name: "write_file" }],
    window: recordWindow(events)
  })
  assert.equal(applied.ended, false)
  assert.equal(applied.replies.length, 1)
  assert.equal(applied.replies[0]?.approvalId, "apr_sdk_replay")
  assert.equal(applied.replies[0]?.approved, false)
  assert.equal(applied.replies[0]?.reason, "already decided")
  const run = getActiveRun(runId)
  const part = Array.isArray(run?.messages[0]?.content) ? run?.messages[0]?.content[0] : undefined
  assert.equal((part as { approvalId?: string; approved?: boolean } | undefined)?.approvalId, "apr_sdk_replay")
  assert.equal((part as { approved?: boolean } | undefined)?.approved, false)
  assert.notEqual((part as { approvalId?: string } | undefined)?.approvalId, "apr_internal_replay")
  deleteActiveRun(runId)
})

test("superseded 行：跳过，不回 SDK", () => {
  const events: SentEvent[] = []
  const runId = "run_superseded"
  hold(runId, "ses_superseded", events)
  insertApproval(getDatabase(), {
    id: "apr_superseded_old",
    runId,
    toolCallId: "tool_superseded",
    name: "write_file",
    args: "{}",
    hmac: "",
    decision: "superseded",
    createdAt: Date.now(),
    sdkApprovalId: supersededSdkApprovalId("apr_superseded_old")
  })
  const applied = applyRestoredOrphanApprovals({
    runId,
    items: [{ approvalId: "apr_superseded_old", toolCallId: "tool_superseded", name: "write_file" }],
    window: recordWindow(events)
  })
  assert.equal(applied.ended, false)
  assert.equal(applied.replies.length, 0)
  assert.equal(getActiveRun(runId)?.messages.length, 0)
  assert.equal(
    events.some((event) => event.type === "tool.result" || event.type === "run.error"),
    false
  )
  deleteActiveRun(runId)
})

test("库无行：不拿内部 id 回 SDK，诚实结束该 run", () => {
  const events: SentEvent[] = []
  const runId = "run_missing_row"
  hold(runId, "ses_missing_row", events)
  const applied = applyRestoredOrphanApprovals({
    runId,
    items: [{ approvalId: "apr_ghost_internal", toolCallId: "tool_ghost", name: "write_file" }],
    window: recordWindow(events)
  })
  assert.equal(applied.ended, true)
  assert.equal(applied.replies.length, 0)
  assert.equal(getActiveRun(runId), undefined)
  assert.equal(getRun(getDatabase(), runId)?.status, "cancelled")
  assert.equal(getRun(getDatabase(), runId)?.error, RESTORE_NO_MATCHING_APPROVAL)
  assert.equal(
    events.some((event) => event.type === "tool-approval-response" || event.approvalId === "apr_ghost_internal"),
    false
  )
  assert.ok(events.some((event) => event.type === "run.error" && event.message === RESTORE_NO_MATCHING_APPROVAL))
})
