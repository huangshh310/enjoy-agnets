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
  stubWriteApprovalPart,
  rememberApproval,
  applyExplicitSessionTruncate,
  markRestoreWaitingSettled,
  resetRestoreWaitingOnceForTests,
  waitForSubagentApproval,
  waitSecondConfirmApproval,
  runStartEvent,
  acceptStreamEvent
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

/** 修之前停止留下的残局：库 waiting_review + 审批行 decision=null，内存里已没有这一轮。 */
function seedStaleWaiting(tag: string) {
  const events: Sent[] = []
  const { runId, sessionId, approvalId } = seed(tag, events)
  rememberApproval({ runId, approvalId, toolCallId: `tool_${approvalId}`, name: "write_file", args: { path: "a" } })
  getDatabase().prepare("UPDATE runs SET status = 'waiting_review' WHERE id = ?").run(runId)
  const db = getDatabase()
  db.prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(`${runId}_u1`, sessionId, "user", "u1", 1)
  db.prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(`${runId}_a1`, sessionId, "assistant", "a1", 2)
  return { runId, sessionId, approvalId, u1: `${runId}_u1`, a1: `${runId}_a1` }
}

function rewindPrecheck(sessionId: string, u1: string, a1: string) {
  return applyExplicitSessionTruncate({ sessionId, fromMessageId: u1, expectedTailIds: [u1, a1], reason: "rewind", dryRun: true })
}

test("残留的 waiting_review（没人能再拍板）不挡「从这里重来」：预检前按停止结清，run / 审批都 cancelled", () => {
  markRestoreWaitingSettled()
  try {
    const { runId, sessionId, approvalId, u1, a1 } = seedStaleWaiting("stale")
    deleteActiveRun(runId)
    assert.deepEqual(rewindPrecheck(sessionId, u1, a1), { ok: true, deleted: 0 })
    assert.equal(getRun(getDatabase(), runId)?.status, "cancelled")
    assert.equal(getApproval(getDatabase(), approvalId)?.decision, "cancelled")
  } finally {
    resetRestoreWaitingOnceForTests()
  }
})

test("对照：回挂还没扫完的 waiting_review 照样挡（等回挂），库不动", () => {
  resetRestoreWaitingOnceForTests()
  const { runId, sessionId, approvalId, u1, a1 } = seedStaleWaiting("restoring")
  deleteActiveRun(runId)
  assert.deepEqual(rewindPrecheck(sessionId, u1, a1), { ok: false, code: "TRUNCATE_RUN_ACTIVE" })
  assert.equal(getRun(getDatabase(), runId)?.status, "waiting_review")
  assert.equal(getApproval(getDatabase(), approvalId)?.decision, null)
})

test("对照：真在等审批（内存里有这一轮）照样挡，库不动", () => {
  markRestoreWaitingSettled()
  const { runId, sessionId, approvalId, u1, a1 } = seedStaleWaiting("live-wait")
  try {
    assert.deepEqual(rewindPrecheck(sessionId, u1, a1), { ok: false, code: "TRUNCATE_RUN_ACTIVE" })
    assert.equal(getRun(getDatabase(), runId)?.status, "waiting_review")
    assert.equal(getApproval(getDatabase(), approvalId)?.decision, null)
  } finally {
    deleteActiveRun(runId)
    resetRestoreWaitingOnceForTests()
  }
})

test("对照：workflow 父行（本来就没有 ActiveRun）的 waiting_review 不被当残留结清", () => {
  markRestoreWaitingSettled()
  try {
    const { runId, sessionId, u1, a1 } = seedStaleWaiting("wf")
    deleteActiveRun(runId)
    getDatabase().prepare("UPDATE runs SET kind = 'workflow' WHERE id = ?").run(runId)
    assert.deepEqual(rewindPrecheck(sessionId, u1, a1), { ok: false, code: "TRUNCATE_RUN_ACTIVE" })
    assert.equal(getRun(getDatabase(), runId)?.status, "waiting_review")
  } finally {
    resetRestoreWaitingOnceForTests()
  }
})

test("X5：结清残留 waiting_review 只动「从这里重来」的那个会话，别的会话的残留原样（等它自己的会话来结清）", () => {
  markRestoreWaitingSettled()
  try {
    const mine = seedStaleWaiting("x5_mine")
    const other = seedStaleWaiting("x5_other")
    deleteActiveRun(mine.runId)
    deleteActiveRun(other.runId)
    assert.notEqual(mine.sessionId, other.sessionId)
    assert.deepEqual(rewindPrecheck(mine.sessionId, mine.u1, mine.a1), { ok: true, deleted: 0 })
    assert.equal(getRun(getDatabase(), mine.runId)?.status, "cancelled", "本会话的残留结清")
    assert.equal(getRun(getDatabase(), other.runId)?.status, "waiting_review", "别的会话的 run 不动")
    assert.equal(getApproval(getDatabase(), other.approvalId)?.decision, null, "别的会话的审批不动")
  } finally {
    resetRestoreWaitingOnceForTests()
  }
})

/** 等不到就算挂住（leo 探针里子 Agent 停后那一张卡就是永远等不到）。 */
function settleWithin<T>(promise: Promise<T>, ms = 1_000): Promise<T | "HANG"> {
  return Promise.race([promise, new Promise<"HANG">((resolve) => setTimeout(() => resolve("HANG"), ms))])
}

function assertNoLateApproval(runId: string, events: Sent[], label: string) {
  assert.ok(!typesAfter(events, "run.error").includes("approval.required"), `${label}：停止之后不推审批卡`)
  assert.equal(listPendingApprovals(getDatabase(), runId).length, 0, `${label}：不留 decision=null 的审批行`)
  assert.equal(getRun(getDatabase(), runId)?.status, "cancelled", `${label}：库 cancelled`)
}

test("soft 4：父一轮停止后子 Agent 的审批才到——直接拒（工具不执行），不落审批行、不推卡、不挂住", async () => {
  const events: Sent[] = []
  const { runId, run } = seed("sub_after", events)
  abortActiveRunMemory(runId)
  const decision = await settleWithin(
    waitForSubagentApproval(run, runId, { toolName: "write_file", toolCallId: "tool_sub_after", input: { path: "a.ts" } })
  )
  assert.equal(decision, "deny")
  assert.deepEqual(run.pendingApprovals, [])
  assertNoLateApproval(runId, events, "子 Agent")
})

test("soft 4：父一轮停止后子 Agent 才来一张缺参 / Explore 只读的审批——入口就拒，不再推工具失败", async () => {
  for (const variant of ["noargs", "explore"] as const) {
    const events: Sent[] = []
    const { runId, run } = seed(`sub_${variant}`, events)
    if (variant === "explore") run.input.mode = "ask" as never
    abortActiveRunMemory(runId)
    const decision = await settleWithin(
      waitForSubagentApproval(run, runId, {
        toolName: "write_file",
        toolCallId: `tool_sub_${variant}`,
        input: variant === "noargs" ? undefined : { path: "a.ts" }
      })
    )
    assert.equal(decision, "deny", variant)
    assert.ok(!typesAfter(events, "run.error").includes("tool.result"), `${variant}：停止之后不再推工具结果`)
  }
})

test("soft 4：子 Agent 审批整理参数（await）途中父一轮被停——同样直接拒，不落审批行、不推卡", async () => {
  const events: Sent[] = []
  const { runId, run } = seed("sub_during", events)
  // desktop_act 要先 await 整理参数；入口闸已过，停止落在这个 await 里。
  const pending = waitForSubagentApproval(run, runId, {
    toolName: "desktop_act",
    toolCallId: "tool_sub_during",
    input: { observationId: "obs_sub", action: "click" }
  })
  abortActiveRunMemory(runId)
  assert.equal(await settleWithin(pending), "deny")
  assert.deepEqual(run.pendingApprovals, [])
  assertNoLateApproval(runId, events, "子 Agent（await 中）")
})

test("对照：父一轮没停时子 Agent 的审批照常落行、推卡", async () => {
  const events: Sent[] = []
  const { runId, run } = seed("sub_live", events)
  const pending = waitForSubagentApproval(run, runId, { toolName: "write_file", toolCallId: "tool_sub_live", input: { path: "a.ts" } })
  try {
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.ok(events.some((event) => event.type === "approval.required" && event.toolCallId === "tool_sub_live"), "卡推出去了")
    assert.equal(run.pendingApprovals.length, 1)
  } finally {
    abortActiveRunMemory(runId)
    await settleWithin(pending)
  }
})

test("soft 4：这一轮停止后桌面二次确认才到——直接拒（不去点），不落审批行、不推卡、不挂住", async () => {
  const events: Sent[] = []
  const { runId, run } = seed("second_after", events)
  abortActiveRunMemory(runId)
  const decision = await settleWithin(waitSecondConfirmApproval(runId, run, { observationId: "obs_2", action: "click" }))
  assert.equal(decision, "deny")
  assert.deepEqual(run.pendingApprovals, [])
  assertNoLateApproval(runId, events, "二次确认")
})

test("对照：没停时桌面二次确认照常推卡", async () => {
  const events: Sent[] = []
  const { runId, run } = seed("second_live", events)
  const pending = waitSecondConfirmApproval(runId, run, { observationId: "obs_2", action: "click" })
  try {
    assert.ok(events.some((event) => event.type === "approval.required"), "卡推出去了")
    assert.equal(run.pendingApprovals.length, 1)
  } finally {
    abortActiveRunMemory(runId)
    await settleWithin(pending)
  }
})

test("host #169 ③：Composer 一轮的 run.start 原样带回 clientRequestId，过出站闸也不丢；没带就不出这个键", () => {
  const input = {
    sessionId: "ses_crid",
    workspaceId: "ws",
    modelId: "m",
    mode: "agent",
    attachments: [],
    messages: [{ id: "u_crid", role: "user", content: "S1 text" }],
    clientRequestId: "req_S1"
  } as never
  const event = acceptStreamEvent(runStartEvent(input, "run_crid", true)) as Record<string, unknown> | null
  assert.equal(event?.type, "run.start")
  assert.equal(event?.clientRequestId, "req_S1", "渲染端靠它认出被停的那一发")
  assert.equal(event?.prompt, "S1 text")
  const bare = acceptStreamEvent(runStartEvent({ ...(input as object), clientRequestId: undefined } as never, "run_bare")) as Record<string, unknown> | null
  assert.equal(bare?.type, "run.start")
  assert.equal("clientRequestId" in (bare ?? {}), false)
})
