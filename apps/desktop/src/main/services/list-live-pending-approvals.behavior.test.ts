/**
 * Inbox 拍板真源：decision IS NULL 且未归档；已决 / 归档不进。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { insertApproval, insertRun, listLivePendingApprovals } from "@enjoy-agents/db"

const { deleteActiveRun, getActiveRun, getDatabase, holdAgentRun, mapLivePendingItem } = await import(
  "./list-live-pending-approvals.behavior.load.ts"
)

test("活会话未决进列表，已决与归档不进", () => {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_pending_sot", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ses_live_sot", "ws_pending_sot", "活着", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("ses_arch_sot", "ws_pending_sot", "归档", 1, 1, 9)
  insertRun(db, {
    id: "run_live_sot",
    sessionId: "ses_live_sot",
    workspaceId: "ws_pending_sot",
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  insertRun(db, {
    id: "run_arch_sot",
    sessionId: "ses_arch_sot",
    workspaceId: "ws_pending_sot",
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  insertApproval(db, {
    id: "apr_live_sot",
    runId: "run_live_sot",
    toolCallId: "tool_live",
    name: "write_file",
    args: "{}",
    hmac: "h",
    decision: null,
    createdAt: 2
  })
  insertApproval(db, {
    id: "apr_done_sot",
    runId: "run_live_sot",
    toolCallId: "tool_done",
    name: "write_file",
    args: "{}",
    hmac: "h",
    decision: "allow",
    createdAt: 3
  })
  insertApproval(db, {
    id: "apr_arch_sot",
    runId: "run_arch_sot",
    toolCallId: "tool_arch",
    name: "write_file",
    args: "{}",
    hmac: "h",
    decision: null,
    createdAt: 4
  })
  const items = listLivePendingApprovals(db)
  assert.ok(items.some((item) => item.id === "apr_live_sot" && item.sessionId === "ses_live_sot"))
  assert.ok(!items.some((item) => item.id === "apr_done_sot"))
  assert.ok(!items.some((item) => item.id === "apr_arch_sot"))
})

test("已结束 run 的未决不进拍板：cancelled / failed 不列", () => {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_dead_run", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ses_dead_run", "ws_dead_run", "死跑", 1, 1)
  insertRun(db, {
    id: "run_cancelled_pending",
    sessionId: "ses_dead_run",
    workspaceId: "ws_dead_run",
    kind: "agent",
    status: "cancelled",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  insertRun(db, {
    id: "run_failed_pending",
    sessionId: "ses_dead_run",
    workspaceId: "ws_dead_run",
    kind: "agent",
    status: "failed",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  insertRun(db, {
    id: "run_running_pending",
    sessionId: "ses_dead_run",
    workspaceId: "ws_dead_run",
    kind: "agent",
    status: "running",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  insertApproval(db, {
    id: "apr_cancelled_pending",
    runId: "run_cancelled_pending",
    toolCallId: "tool_c",
    name: "write_file",
    args: "{}",
    hmac: "h",
    decision: null,
    createdAt: 5
  })
  insertApproval(db, {
    id: "apr_failed_pending",
    runId: "run_failed_pending",
    toolCallId: "tool_f",
    name: "write_file",
    args: "{}",
    hmac: "h",
    decision: null,
    createdAt: 6
  })
  insertApproval(db, {
    id: "apr_running_pending",
    runId: "run_running_pending",
    toolCallId: "tool_r",
    name: "write_file",
    args: "{}",
    hmac: "h",
    decision: null,
    createdAt: 7
  })
  const items = listLivePendingApprovals(db)
  assert.ok(!items.some((item) => item.id === "apr_cancelled_pending"))
  assert.ok(!items.some((item) => item.id === "apr_failed_pending"))
  assert.ok(items.some((item) => item.id === "apr_running_pending"))
})

test("内存 pending args 优先于 HMAC 库拷贝，保留 desktop_act 提示", () => {
  const row = {
    id: "apr_mem",
    runId: "run_mem",
    sessionId: "ses_mem",
    workspaceId: "ws_mem",
    sessionTitle: "Note",
    name: "desktop_act",
    toolCallId: "tool_mem",
    createdAt: 1,
    args: JSON.stringify({ action: "click" }),
    requestArgs: null
  }
  holdAgentRun({
    runId: "run_mem",
    window: {
      isDestroyed: () => false,
      webContents: { send() {} }
    } as never,
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId: "ses_mem",
      workspaceId: "ws_mem",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "click" }]
    }
  })
  const run = getActiveRun("run_mem")
  run?.pendingApprovals.push({
    approvalId: "apr_mem",
    toolCallId: "tool_mem",
    name: "desktop_act",
    args: {
      action: "click",
      sensitive: false,
      thumbnailPath: "/tmp/shot.png",
      needsSecondConfirm: true
    }
  })
  assert.deepEqual(mapLivePendingItem(row).args, {
    action: "click",
    sensitive: false,
    thumbnailPath: "/tmp/shot.png",
    needsSecondConfirm: true
  })
  deleteActiveRun("run_mem")
})

test("HMAC 库参进 Inbox args，park 字段剥掉，缺参不补 {}", () => {
  const row = {
    id: "apr_map",
    runId: "run_map",
    sessionId: "ses_map",
    workspaceId: "ws_map",
    sessionTitle: "Note",
    name: "write_file",
    toolCallId: "tool_map",
    createdAt: 1
  }
  assert.deepEqual(
    mapLivePendingItem({
      ...row,
      args: JSON.stringify({
        path: "e2e-stub.txt",
        content: "from stub",
        thumbnailPath: "/tmp/shot.png",
        appKey: "notes"
      })
    }).args,
    { path: "e2e-stub.txt", content: "from stub" }
  )
  assert.equal("args" in mapLivePendingItem({ ...row, args: null, requestArgs: null }), false)
  assert.deepEqual(mapLivePendingItem({ ...row, args: "{}" }).args, {})
})

test("20KB write_file 未决仍进 Inbox，超限 args 省略、条目留下", () => {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_huge_args", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ses_huge_args", "ws_huge_args", "huge", 1, 1)
  insertRun(db, {
    id: "run_huge_args",
    sessionId: "ses_huge_args",
    workspaceId: "ws_huge_args",
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  insertApproval(db, {
    id: "apr_huge_args",
    runId: "run_huge_args",
    toolCallId: "tool_huge",
    name: "write_file",
    args: JSON.stringify({ path: "big.txt", content: "x".repeat(20_000) }),
    hmac: "h",
    decision: null,
    createdAt: 8
  })
  const live = listLivePendingApprovals(db).find((item) => item.id === "apr_huge_args")
  assert.ok(live)
  const mapped = mapLivePendingItem(live)
  assert.equal(mapped.id, "apr_huge_args")
  assert.equal(mapped.name, "write_file")
  assert.equal("args" in mapped, false)
})
