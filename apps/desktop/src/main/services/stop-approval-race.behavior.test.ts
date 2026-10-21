/**
 * jojo 巡检 211e3bbb 1c：审批卡刚到的那一刻点停止。
 * 真走 consumeRun + abortActiveRunMemory：停在审批事件之前 / 之中 / 之后，库里这一轮都必须是 cancelled，
 * 不留 decision=null 的审批行，停止之后不再推 approval.required（界面不会再挂卡、挂「执行中」）。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"

const {
  insertRun,
  getRun,
  getApproval,
  listPendingApprovals,
  getDatabase,
  deleteActiveRun,
  getActiveRun,
  holdAgentRun,
  abortActiveRunMemory,
  consumeRun,
  persistWaitingRun,
  persistRunningCheckpoint,
  stubWriteApprovalPart
} = await import("./stop-approval-race.behavior.load.ts")

type Sent = { type: string; decision?: string; code?: string; toolCallId?: string }

function recordWindow(events: Sent[]): BrowserWindow {
  return {
    isDestroyed: () => false,
    webContents: { send: (_ch: string, event: Sent) => void events.push(event) }
  } as unknown as BrowserWindow
}

let seq = 900
function seed(tag: string, events: Sent[]) {
  seq += 1
  const runId = `run_sa_${tag}_${seq}`
  const sessionId = `ses_sa_${tag}_${seq}`
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_sa", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, "ws_sa", "stop approval", 1, 1)
  insertRun(db, {
    id: runId,
    sessionId,
    workspaceId: "ws_sa",
    kind: "agent",
    status: "running",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  const messages = [{ role: "user" as const, content: "very slow" }]
  holdAgentRun({
    runId,
    window: recordWindow(events),
    workspaceRoot: "/tmp",
    messages: [...messages],
    input: { sessionId, workspaceId: "ws_sa", modelId: "m", mode: "agent", attachments: [], messages }
  })
  const run = getActiveRun(runId)
  if (!run) throw new Error("hold failed")
  run.pumping = true
  const approval = stubWriteApprovalPart(seq) as { approvalId: string; toolCallId: string }
  return { runId, sessionId, run, approvalPart: approval as Record<string, unknown>, approvalId: approval.approvalId }
}

/** 泵在 consume 之后的同一步：有未决就停车写 waiting_review（agent-pump runOnePump）。 */
function pumpTail(run: NonNullable<ReturnType<typeof getActiveRun>>, runId: string) {
  if (run.pendingApprovals.length > 0) persistWaitingRun(run, runId)
}

function typesAfter(events: Sent[], type: string): string[] {
  const index = events.findIndex((event) => event.type === type)
  return index < 0 ? [] : events.slice(index + 1).map((event) => event.type)
}

function assertSettledStopped(runId: string, approvalId: string, events: Sent[]) {
  assert.equal(getRun(getDatabase(), runId)?.status, "cancelled", "库里这一轮是 cancelled，不是 waiting_review")
  assert.equal(listPendingApprovals(getDatabase(), runId).length, 0, "不留 decision=null 的审批行")
  const stored = getApproval(getDatabase(), approvalId)
  assert.ok(stored == null || stored.decision === "cancelled", `审批行要么没写，要么 cancelled（实际 ${stored?.decision}）`)
  assert.equal(getActiveRun(runId), undefined, "内存里已经没有这一轮")
  assert.ok(events.some((event) => event.type === "run.error" && event.code === "user_aborted"), "推过停止收尾")
  assert.ok(!typesAfter(events, "run.error").includes("approval.required"), "停止之后不再推审批卡")
}

test("停在审批事件之前（stub 慢流睡着时点停止，醒来照样吐审批）：迟到的审批丢掉，库 cancelled", async () => {
  const events: Sent[] = []
  const { runId, run, approvalPart, approvalId } = seed("before", events)
  async function* stream() {
    yield { type: "text-start", id: "text" }
    yield { type: "text-delta", text: "one " }
    abortActiveRunMemory(runId)
    yield approvalPart
  }
  try {
    await consumeRun(runId, run, stream())
    pumpTail(run, runId)
    assert.deepEqual(run.pendingApprovals, [], "停掉的这一轮不挂未决审批")
    assertSettledStopped(runId, approvalId, events)
    assert.ok(!events.some((event) => event.type === "approval.required"), "一张审批卡都没推")
  } finally {
    deleteActiveRun(runId)
  }
})

test("停在审批事件之中（事件已出流、正在 consumeApprovalRequired 里 await 时到）：照样丢掉，库 cancelled", async () => {
  const events: Sent[] = []
  const { runId, run, approvalPart, approvalId } = seed("during", events)
  let stoppedAt = ""
  const parts: Record<string, unknown>[] = [{ type: "text-start", id: "text" }, approvalPart]
  const stream: AsyncIterable<Record<string, unknown>> = {
    [Symbol.asyncIterator]() {
      return {
        next() {
          const value = parts.shift()
          const result = Promise.resolve(value ? { value, done: false as const } : { value: undefined, done: true as const })
          if (value === approvalPart) {
            // 第一跳：consumeFullStream 拿到审批事件；第二跳排在它进 consumeApprovalRequired 并 await 之后。
            void result.then(() =>
              queueMicrotask(() => {
                stoppedAt = events.some((event) => event.type === "approval.required") ? "after-emit" : "in-flight"
                abortActiveRunMemory(runId)
              })
            )
          }
          return result
        }
      }
    }
  }
  try {
    await consumeRun(runId, run, stream)
    pumpTail(run, runId)
    assert.equal(stoppedAt, "in-flight", "停止确实落在审批事件处理途中")
    assert.deepEqual(run.pendingApprovals, [])
    assertSettledStopped(runId, approvalId, events)
  } finally {
    deleteActiveRun(runId)
  }
})

test("停在审批卡推出之后：未决结清 cancelled，推 approval.resolved，库 cancelled", async () => {
  const events: Sent[] = []
  const { runId, run, approvalPart, approvalId } = seed("after", events)
  async function* stream() {
    yield approvalPart
    abortActiveRunMemory(runId)
  }
  try {
    await consumeRun(runId, run, stream())
    pumpTail(run, runId)
    assert.ok(events.some((event) => event.type === "approval.required"), "卡先推出去了")
    assert.equal(getApproval(getDatabase(), approvalId)?.decision, "cancelled")
    assert.ok(events.some((event) => event.type === "approval.resolved" && event.decision === "cancelled"))
    assertSettledStopped(runId, approvalId, events)
  } finally {
    deleteActiveRun(runId)
  }
})

test("缺参的审批在停止后到：不再写拒绝行、不推工具失败", async () => {
  const events: Sent[] = []
  const { runId, run } = seed("noargs", events)
  async function* stream() {
    abortActiveRunMemory(runId)
    yield { type: "tool-approval-request", toolCallId: "tool_noargs", approvalId: "apr_sa_noargs", toolName: "write_file" }
  }
  try {
    await consumeRun(runId, run, stream())
    assert.equal(getApproval(getDatabase(), "apr_sa_noargs"), undefined, "停掉的这一轮不再落审批行")
    assert.ok(!typesAfter(events, "run.error").includes("tool.result"), "停止之后不再推工具结果")
    assert.equal(getRun(getDatabase(), runId)?.status, "cancelled")
  } finally {
    deleteActiveRun(runId)
  }
})

test("已停止的 run：泵晚到的停车 / 工具边界写库都不能把 cancelled 改回 waiting_review / running", () => {
  const events: Sent[] = []
  const { runId, run } = seed("late-park", events)
  abortActiveRunMemory(runId)
  assert.equal(getRun(getDatabase(), runId)?.status, "cancelled")
  run.pendingApprovals = [{ approvalId: "apr_late", toolCallId: "tool_late", name: "write_file", args: { path: "a" } }]
  persistWaitingRun(run, runId)
  assert.equal(getRun(getDatabase(), runId)?.status, "cancelled", "迟到的停车不写 waiting_review")
  run.pendingApprovals = []
  persistRunningCheckpoint(run, runId)
  assert.equal(getRun(getDatabase(), runId)?.status, "cancelled", "迟到的工具边界不写 running")
})

test("对照：没停的 run 照常停车 waiting_review、照常写工具边界 running", () => {
  const events: Sent[] = []
  const { runId, run } = seed("live-park", events)
  try {
    run.pendingApprovals = [{ approvalId: "apr_live", toolCallId: "tool_live", name: "write_file", args: { path: "a" } }]
    persistWaitingRun(run, runId)
    assert.equal(getRun(getDatabase(), runId)?.status, "waiting_review")
    run.pendingApprovals = []
    persistRunningCheckpoint(run, runId)
    assert.equal(getRun(getDatabase(), runId)?.status, "running")
  } finally {
    deleteActiveRun(runId)
  }
})

