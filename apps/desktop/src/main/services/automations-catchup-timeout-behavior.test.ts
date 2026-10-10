/**
 * 补跑 30min：走 decideApproval / waitForSubagentApproval / failAgentPump。假时钟。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"
import { getApproval, getRun, insertApproval, insertRun, listPendingApprovals } from "@enjoy-agents/db"
import {
  CATCH_UP_APPROVAL_TIMEOUT,
  CATCH_UP_INTERRUPTED_BY_RESTART
} from "@enjoy-agents/ipc-contract/automations-missed"
const {
  rememberApproval,
  decideApproval,
  deleteActiveRun,
  getActiveRun,
  holdAgentRun,
  waitForRunSettle,
  waitSecondConfirmApproval,
  completeAgentRun,
  deleteSetting,
  getDatabase,
  getSetting,
  setSetting,
  readAutomations,
  writeAutomations,
  failAgentPump,
  armCatchUpApprovalTimeout,
  expireCatchUpApproval,
  clearCatchUpApprovalTimeout,
  hasCatchUpApprovalTimeout,
  waitForSubagentApproval,
  failCatchUpWaitingOnRestart,
  claimMissedPoint,
  defaultSettingsIo,
  listMissedForAutomation,
  finishAutomationRun
} = await import("./automations-catchup-timeout-behavior.load.ts")

const MIN = 60_000

type SentEvent = { type: string; message?: string; runId?: string; code?: string; toolCallId?: string }

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
  if (getRun(getDatabase(), runId)) return
  insertRun(getDatabase(), {
    id: runId,
    sessionId,
    workspaceId: "ws_1",
    kind: "agent",
    status: "running",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
}

async function waitUntil(pred: () => boolean, label: string): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (pred()) return
    await new Promise<void>((resolve) => setImmediate(resolve))
  }
  throw new Error(`timed out waiting: ${label}`)
}

function holdCatchUp(runId: string, events: SentEvent[]) {
  const sessionId = `ses_${runId}`
  seedRun(runId, sessionId)
  holdAgentRun({
    runId,
    window: recordWindow(events),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId,
      workspaceId: "ws_1",
      modelId: "m",
      mode: "agent",
      attachments: [],
      denyAnyDesktop: true,
      automationSource: {
        automationId: "auto_1",
        automationName: "晨间",
        scheduledAt: 1,
        isCatchUp: true
      },
      messages: [{ role: "user", content: "x" }]
    }
  })
  const run = getActiveRun(runId)
  if (!run) throw new Error("holdCatchUp failed")
  run.pumping = true
  return run
}

test("补跑超时同一工具只发一条 approval.resolved", async () => {
  const runId = "run_catchup_one_resolved"
  const events: SentEvent[] = []
  const run = holdCatchUp(runId, events)
  rememberApproval({
    runId,
    approvalId: "apr_one",
    toolCallId: "tool_one",
    name: "write_file",
    args: { path: "one.txt" }
  })
  run.pendingApprovals.push({
    approvalId: "apr_one",
    toolCallId: "tool_one",
    name: "write_file"
  })
  run.tools = [
    {
      id: "tool_one",
      name: "write_file",
      state: "approval-requested",
      args: { path: "one.txt" }
    }
  ]
  await expireCatchUpApproval(runId)
  const resolved = events.filter(
    (event) => event.type === "approval.resolved" && event.toolCallId === "tool_one"
  )
  assert.equal(resolved.length, 1)
  deleteActiveRun(runId)
})

test("同一 runId 失败两次都能完整收尾", async () => {
  const runId = "run_fail_twice"
  const events: SentEvent[] = []
  const first = holdCatchUp(runId, events)
  await failAgentPump(runId, first, new Error("first boom"))
  assert.equal(getRun(getDatabase(), runId)?.status, "failed")
  assert.ok(events.some((item) => item.type === "run.error"))
  assert.equal((await waitForRunSettle(runId)).status, "error")
  assert.equal(getActiveRun(runId), undefined)

  events.length = 0
  const second = holdCatchUp(runId, events)
  await failAgentPump(runId, second, new Error("second boom"))
  assert.equal(getRun(getDatabase(), runId)?.status, "failed")
  assert.ok(events.some((item) => item.type === "run.error"))
  assert.equal((await waitForRunSettle(runId)).status, "error")
  assert.equal(getActiveRun(runId), undefined)
})

test("第 5 分钟批准，第 30 分钟不得标成 failed", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"], now: 0 })
  const runId = "run_decide_clear"
  const events: SentEvent[] = []
  const run = holdCatchUp(runId, events)
  const pending = { approvalId: "apr_1", toolCallId: "t1", name: "write_file" }
  run.pendingApprovals.push(pending)
  rememberApproval({ runId, ...pending, args: {} })
  armCatchUpApprovalTimeout(runId)
  assert.equal(hasCatchUpApprovalTimeout(runId), true)
  t.mock.timers.tick(5 * MIN)
  void run.approvalGate.wait("apr_1")
  await decideApproval(run.window, {
    runId,
    approvalId: "apr_1",
    toolCallId: "t1",
    decision: "allow"
  })
  assert.equal(hasCatchUpApprovalTimeout(runId), false)
  await expireCatchUpApproval(runId)
  t.mock.timers.tick(25 * MIN)
  assert.equal(events.some((item) => item.type === "run.error"), false)
  assert.ok(getActiveRun(runId))
  clearCatchUpApprovalTimeout(runId)
  deleteActiveRun(runId)
})

test("子 agent 审批超时后不能再调工具，最终 failed 不发 run.end", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"], now: 0 })
  const runId = "run_subagent_timeout"
  const events: SentEvent[] = []
  const run = holdCatchUp(runId, events)
  const decided = waitForSubagentApproval(run, runId, {
    toolName: "write_file",
    toolCallId: "t_sub",
    input: { path: "a.ts" }
  })
  await waitUntil(() => hasCatchUpApprovalTimeout(runId), "subagent catch-up timer")
  const settled = waitForRunSettle(runId)
  t.mock.timers.tick(30 * MIN)
  assert.equal(await decided, "deny")
  assert.equal(run.abort.signal.aborted, true)
  assert.equal((await settled).status, "error")
  assert.equal(getRun(getDatabase(), runId)?.error, CATCH_UP_APPROVAL_TIMEOUT)
  assert.equal(getRun(getDatabase(), runId)?.status, "failed")
  assert.ok(events.some((item) => item.type === "run.error" && item.message === CATCH_UP_APPROVAL_TIMEOUT))
  let ended = false
  completeAgentRun({
    runId,
    run,
    emit: () => {
      ended = true
    }
  })
  assert.equal(ended, false)
  assert.ok(!events.some((item) => item.type === "run.end"))
  assert.equal(getActiveRun(runId), undefined)
})

test("二次确认超时→拒绝→failed catch_up_approval_timeout", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"], now: 0 })
  const runId = "run_second_timeout"
  const events: SentEvent[] = []
  const run = holdCatchUp(runId, events)
  const decided = waitSecondConfirmApproval(runId, run, { appKey: "com.apple.notes" })
  assert.equal(hasCatchUpApprovalTimeout(runId), true)
  const settled = waitForRunSettle(runId)
  t.mock.timers.tick(30 * MIN)
  assert.equal(await decided, "deny")
  assert.equal((await settled).summary, CATCH_UP_APPROVAL_TIMEOUT)
  assert.equal(getRun(getDatabase(), runId)?.status, "failed")
  assert.ok(events.some((item) => item.type === "run.error"))
})

test("超时与 failAgentPump 并发只收尾一次", async () => {
  const runId = "run_once"
  const events: SentEvent[] = []
  const run = holdCatchUp(runId, events)
  run.pendingApprovals.push({ approvalId: "apr_x", toolCallId: "tx", name: "write_file" })
  const error = Object.assign(new Error(CATCH_UP_APPROVAL_TIMEOUT), {
    code: CATCH_UP_APPROVAL_TIMEOUT
  })
  await Promise.all([
    expireCatchUpApproval(runId),
    expireCatchUpApproval(runId),
    failAgentPump(runId, run, error)
  ])
  assert.equal(events.filter((item) => item.type === "run.error").length, 1)
  assert.equal(getActiveRun(runId), undefined)
})

test("泵先抢到 fail 仍写出 catch_up_approval_timeout，不发 warning", async () => {
  const runId = "run_pump_wins"
  const events: SentEvent[] = []
  const prev = getSetting("automations")
  writeAutomations([
    {
      id: "auto_1",
      name: "晨间",
      prompt: "x",
      trigger: "manual",
      enabled: true,
      updatedAt: 1
    }
  ])
  const io = defaultSettingsIo()
  const scheduledAt = Date.now()
  claimMissedPoint(io, {
    automationId: "auto_1",
    scheduledAt,
    recordedAt: scheduledAt,
    kind: "catch_up",
    status: "running",
    runId,
    isCatchUp: true
  })
  try {
    const run = holdCatchUp(runId, events)
    run.pendingApprovals.push({ approvalId: "apr_race", toolCallId: "tr", name: "write_file" })
    const abortError = Object.assign(new Error("This operation was aborted."), { name: "AbortError" })
    run.abort.signal.addEventListener("abort", () => {
      void failAgentPump(runId, run, abortError)
    })
    const settled = waitForRunSettle(runId)
    await expireCatchUpApproval(runId)
    const result = await settled
    assert.equal(result.summary, CATCH_UP_APPROVAL_TIMEOUT)
    assert.equal(getRun(getDatabase(), runId)?.status, "failed")
    assert.equal(getRun(getDatabase(), runId)?.error, CATCH_UP_APPROVAL_TIMEOUT)
    assert.ok(!events.some((item) => item.type === "generation.warning"))
    finishAutomationRun("auto_1", "failed", result.summary, { scheduledAt, isCatchUp: true })
    assert.equal(readAutomations().find((item) => item.id === "auto_1")?.lastRunErrorCode, CATCH_UP_APPROVAL_TIMEOUT)
    assert.equal(listMissedForAutomation(io, "auto_1", scheduledAt)[0]?.code, CATCH_UP_APPROVAL_TIMEOUT)
  } finally {
    if (prev === undefined) deleteSetting("automations")
    else setSetting("automations", prev)
  }
})

test("多条待审批决定一条后计时器仍在，全部处理完才清", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"], now: 0 })
  const runId = "run_multi_pending"
  const events: SentEvent[] = []
  const run = holdCatchUp(runId, events)
  const first = { approvalId: "apr_a", toolCallId: "ta", name: "write_file" }
  const second = { approvalId: "apr_b", toolCallId: "tb", name: "write_file" }
  run.pendingApprovals.push(first, second)
  rememberApproval({ runId, ...first, args: {} })
  rememberApproval({ runId, ...second, args: {} })
  armCatchUpApprovalTimeout(runId)
  void run.approvalGate.wait(first.approvalId)
  await decideApproval(run.window, {
    runId,
    approvalId: first.approvalId,
    toolCallId: first.toolCallId,
    decision: "allow"
  })
  assert.equal(hasCatchUpApprovalTimeout(runId), true)
  assert.equal(run.pendingApprovals.length, 1)
  void run.approvalGate.wait(second.approvalId)
  await decideApproval(run.window, {
    runId,
    approvalId: second.approvalId,
    toolCallId: second.toolCallId,
    decision: "allow"
  })
  assert.equal(hasCatchUpApprovalTimeout(runId), false)
  t.mock.timers.tick(30 * MIN)
  assert.equal(events.some((item) => item.type === "run.error"), false)
  deleteActiveRun(runId)
})

test("重启恢复补跑 waiting 必须在有限时间内收尾", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"], now: 0 })
  const runId = "run_wait"
  const sessionId = "ses_wait"
  insertRun(getDatabase(), {
    id: runId,
    sessionId,
    workspaceId: "ws_1",
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    checkpoint: JSON.stringify({
      automationSource: {
        automationId: "auto_wait",
        automationName: "晨间",
        scheduledAt: 1,
        isCatchUp: true
      }
    }),
    error: null
  })
  insertApproval(getDatabase(), {
    id: "apr_wait",
    runId,
    toolCallId: "tw",
    name: "write_file",
    args: "{}",
    hmac: "x",
    decision: null,
    createdAt: 0
  })
  const prev = getSetting("automations")
  setSetting(
    "automations",
    JSON.stringify([
      {
        id: "auto_wait",
        name: "晨间",
        prompt: "x",
        trigger: "cron",
        enabled: true,
        updatedAt: 1
      }
    ])
  )
  const io = defaultSettingsIo()
  claimMissedPoint(io, {
    automationId: "auto_wait",
    scheduledAt: 0,
    recordedAt: 0,
    kind: "catch_up",
    status: "running",
    runId,
    isCatchUp: true
  })
  try {
    failCatchUpWaitingOnRestart(runId)
    assert.equal(getRun(getDatabase(), runId)?.status, "failed")
    assert.equal(getRun(getDatabase(), runId)?.error, CATCH_UP_INTERRUPTED_BY_RESTART)
    assert.equal(getApproval(getDatabase(), "apr_wait")?.decision, "deny")
    assert.equal(listPendingApprovals(getDatabase(), runId).length, 0)
    assert.equal(listMissedForAutomation(io, "auto_wait", 0)[0]?.status, "failed")
    assert.equal(listMissedForAutomation(io, "auto_wait", 0)[0]?.code, CATCH_UP_INTERRUPTED_BY_RESTART)
    assert.equal(
      readAutomations().find((item) => item.id === "auto_wait")?.lastRunErrorCode,
      CATCH_UP_INTERRUPTED_BY_RESTART
    )
    assert.equal(hasCatchUpApprovalTimeout(runId), false)
    t.mock.timers.tick(30 * MIN)
    assert.equal(hasCatchUpApprovalTimeout(runId), false)
  } finally {
    if (prev === undefined) deleteSetting("automations")
    else setSetting("automations", prev)
  }
})

test("未知 lastRunErrorCode 读成 undefined，整行保留", () => {
  const prev = getSetting("automations")
  setSetting(
    "automations",
    JSON.stringify([
      {
        id: "auto_keep",
        name: "复盘",
        prompt: "对照 diff",
        trigger: "manual",
        enabled: true,
        updatedAt: 1,
        lastRunErrorCode: "timeout"
      }
    ])
  )
  try {
    const rows = readAutomations()
    const row = rows.find((item) => item.id === "auto_keep")
    assert.ok(row)
    assert.equal(row.lastRunErrorCode, undefined)
    writeAutomations(rows)
    assert.ok(readAutomations().some((item) => item.id === "auto_keep"))
  } finally {
    if (prev === undefined) deleteSetting("automations")
    else setSetting("automations", prev)
  }
})
