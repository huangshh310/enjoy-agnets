/**
 * 补跑 30min 计时器：挂、清、触发。假时钟，不测纯辅助函数。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"
import { CATCH_UP_APPROVAL_TIMEOUT } from "@enjoy-agents/ipc-contract/automations-missed"
import { createApprovalGate } from "./approval-gate.ts"
import type { ActiveRun } from "./agent-run-state.ts"
import {
  armCatchUpApprovalTimeout,
  expireCatchUpApproval,
  installCatchUpRunForTests,
  setCatchUpFailPumpForTests,
  uninstallCatchUpRunForTests
} from "./automations-catchup-timeout.ts"
import {
  clearCatchUpApprovalTimeout,
  hasCatchUpApprovalTimeout
} from "./automations-catchup-timer.ts"
import { claimCatchUpFail, releaseCatchUpFail } from "./claim-catchup-fail.ts"
import {
  beginSecondConfirmCatchUpWait,
  beginSubagentCatchUpWait
} from "./park-catch-up-approval.ts"
import { failCatchUpWaiting, restoreWaitingCatchUpAction } from "./automations-catchup-orphans.ts"
import { claimMissedPoint, listMissedForAutomation, memorySettingsIo } from "./automations-missed-store.ts"
import { CATCH_UP_INTERRUPTED_BY_RESTART } from "@enjoy-agents/ipc-contract/automations-missed"

const MIN = 60_000

function stubWindow(): BrowserWindow {
  return {
    isDestroyed: () => true,
    webContents: { send() {} }
  } as unknown as BrowserWindow
}

function fakeCatchUpRun(runId: string): ActiveRun {
  return {
    abort: new AbortController(),
    messages: [],
    window: stubWindow(),
    workspaceRoot: "/tmp",
    pendingApprovals: [],
    sessionApprovedTools: new Set(),
    sessionApprovedBashPrefixes: new Set(),
    approvalGate: createApprovalGate(),
    pumping: false,
    resumeAfterPump: false,
    continuePump: false,
    todoContinues: 0,
    startedAt: 0,
    citedSources: [],
    transcript: { visible: "" },
    tools: [],
    assistantPersisted: false,
    input: {
      sessionId: `ses_${runId}`,
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
  } as unknown as ActiveRun
}

function holdCatchUp(runId: string): ActiveRun {
  const run = fakeCatchUpRun(runId)
  installCatchUpRunForTests(runId, run)
  return run
}

function teardown(runId: string): void {
  clearCatchUpApprovalTimeout(runId)
  releaseCatchUpFail(runId)
  uninstallCatchUpRunForTests(runId)
  setCatchUpFailPumpForTests(undefined)
}

/** decideApproval 批准后：清计时器并卸掉该条待审批。 */
function decideAllow(runId: string, run: ActiveRun, approvalId: string): void {
  clearCatchUpApprovalTimeout(runId)
  run.pendingApprovals = run.pendingApprovals.filter((item) => item.approvalId !== approvalId)
  run.approvalGate.resolve(approvalId, "allow")
}

test("第 5 分钟批准，第 30 分钟不得标成 failed", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"], now: 0 })
  const runId = "run_decide_clear"
  const ended: string[] = []
  const run = holdCatchUp(runId)
  run.pendingApprovals.push({ approvalId: "apr_1", toolCallId: "t1", name: "write_file" })
  setCatchUpFailPumpForTests(async (_id, _run, error) => {
    ended.push(error instanceof Error ? error.message : String(error))
  })
  armCatchUpApprovalTimeout(runId)
  assert.equal(hasCatchUpApprovalTimeout(runId), true)
  t.mock.timers.tick(5 * MIN)
  decideAllow(runId, run, "apr_1")
  assert.equal(hasCatchUpApprovalTimeout(runId), false)
  await expireCatchUpApproval(runId)
  assert.deepEqual(ended, [])
  t.mock.timers.tick(25 * MIN)
  assert.deepEqual(ended, [])
  teardown(runId)
})

test("子 agent 审批超时→拒绝→failed catch_up_approval_timeout", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"], now: 0 })
  const runId = "run_subagent_timeout"
  const ended: string[] = []
  let markFailed!: () => void
  const failed = new Promise<void>((resolve) => {
    markFailed = resolve
  })
  const run = holdCatchUp(runId)
  setCatchUpFailPumpForTests(async (_id, _run, error) => {
    ended.push((error as { code?: string }).code ?? "")
    markFailed()
  })
  const decided = beginSubagentCatchUpWait(run, runId, {
    approvalId: "apr_sub",
    toolCallId: "t_sub",
    name: "write_file"
  })
  assert.equal(hasCatchUpApprovalTimeout(runId), true)
  t.mock.timers.tick(30 * MIN)
  assert.equal(await decided, "deny")
  await failed
  assert.deepEqual(ended, [CATCH_UP_APPROVAL_TIMEOUT])
  teardown(runId)
})

test("二次确认超时→拒绝→failed catch_up_approval_timeout", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"], now: 0 })
  const runId = "run_second_timeout"
  const ended: string[] = []
  let markFailed!: () => void
  const failed = new Promise<void>((resolve) => {
    markFailed = resolve
  })
  const run = holdCatchUp(runId)
  setCatchUpFailPumpForTests(async (_id, _run, error) => {
    ended.push((error as { code?: string }).code ?? "")
    markFailed()
  })
  const decided = beginSecondConfirmCatchUpWait(run, runId, {
    approvalId: "apr_sc",
    toolCallId: "t_sc"
  })
  assert.equal(hasCatchUpApprovalTimeout(runId), true)
  t.mock.timers.tick(30 * MIN)
  assert.equal(await decided, "deny")
  await failed
  assert.deepEqual(ended, [CATCH_UP_APPROVAL_TIMEOUT])
  teardown(runId)
})

test("超时与 failAgentPump 并发只收尾一次", async () => {
  const runId = "run_once"
  const ended: string[] = []
  const run = holdCatchUp(runId)
  run.pendingApprovals.push({ approvalId: "apr_x", toolCallId: "tx", name: "write_file" })
  const fail = async (id: string, _run: ActiveRun, error: unknown) => {
    if (!claimCatchUpFail(id)) return
    ended.push((error as { code?: string }).code ?? "")
  }
  await Promise.all([
    expireCatchUpApproval(runId, fail),
    expireCatchUpApproval(runId, fail),
    fail(runId, run, { code: CATCH_UP_APPROVAL_TIMEOUT })
  ])
  assert.equal(ended.length, 1)
  assert.equal(ended[0], CATCH_UP_APPROVAL_TIMEOUT)
  teardown(runId)
})

test("重启恢复补跑 waiting 必须在有限时间内收尾", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"], now: 0 })
  const runId = "run_wait"
  assert.equal(
    restoreWaitingCatchUpAction({
      automationId: "auto_wait",
      automationName: "晨间",
      scheduledAt: 1,
      isCatchUp: true
    }),
    "fail_interrupted"
  )
  const io = memorySettingsIo()
  claimMissedPoint(io, {
    automationId: "auto_wait",
    scheduledAt: 0,
    recordedAt: 0,
    kind: "catch_up",
    status: "running",
    runId,
    isCatchUp: true
  })
  const failed = failCatchUpWaiting(io, runId, 0)
  assert.equal(failed[0]?.status, "failed")
  assert.equal(failed[0]?.code, CATCH_UP_INTERRUPTED_BY_RESTART)
  assert.equal(hasCatchUpApprovalTimeout(runId), false)
  t.mock.timers.tick(30 * MIN)
  assert.equal(hasCatchUpApprovalTimeout(runId), false)
  assert.equal(listMissedForAutomation(io, "auto_wait", 0)[0]?.status, "failed")
})
