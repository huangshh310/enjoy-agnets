import assert from "node:assert/strict"
import { test } from "node:test"
import {
  applyEventToPark,
  attachParkedRunId,
  captureParkedRun,
  idleComposerPatch,
  nextParks
} from "./session-run-park.ts"
import type { ParkedRun } from "./attention.types.ts"

function park(partial: Partial<ParkedRun> = {}): ParkedRun {
  return {
    sessionId: "ses_b",
    runId: null,
    running: true,
    runStartedAt: 10,
    pendingApproval: null,
    error: null,
    thinkingLabel: "Thinking",
    pendingStreamEvents: [],
    ...partial
  }
}

test("空闲会话不停车", () => {
  assert.equal(
    captureParkedRun({
      sessionId: "ses_a",
      runId: null,
      running: false,
      runStartedAt: null,
      pendingApproval: null,
      error: null,
      thinkingLabel: "Thinking",
      pendingStreamEvents: []
    }),
    null
  )
})

test("运行中会话停车保留 running，即使还没有 runId", () => {
  const snapped = captureParkedRun({
    sessionId: "ses_b",
    runId: null,
    running: true,
    runStartedAt: 99,
    pendingApproval: null,
    error: null,
    thinkingLabel: "Waiting for approval",
    pendingStreamEvents: []
  })
  assert.equal(snapped?.running, true)
  assert.equal(snapped?.sessionId, "ses_b")
})

test("后台 approval.required 写入停车 pendingApproval", () => {
  const event = {
    type: "approval.required" as const,
    runId: "run_b",
    toolCallId: "tc",
    approvalId: "apr",
    name: "bash",
    args: {}
  }
  const next = applyEventToPark(park(), event)
  assert.equal(next.pendingApproval?.approvalId, "apr")
  assert.equal(next.runId, "run_b")
})

test("没有 park 时回挂 approval.required 也要落停车", () => {
  const event = {
    type: "approval.required" as const,
    runId: "run_wait",
    toolCallId: "tc",
    approvalId: "apr",
    name: "write_file",
    args: { path: "note.txt" }
  }
  const next = nextParks({}, "ses_wait", event)
  assert.equal(next?.ses_wait?.pendingApproval?.approvalId, "apr")
  assert.equal(next?.ses_wait?.runId, "run_wait")
  assert.equal(next?.ses_wait?.running, true)
})

test("没有 park 时标题补全 run.start / run.error 不落停车", () => {
  assert.equal(
    nextParks({}, "ses_wait", {
      type: "run.start",
      runId: "run_title",
      sessionId: "ses_wait",
      kind: "completion"
    }),
    null
  )
  const titleError = {
    type: "run.error" as const,
    runId: "run_title",
    message: "Request timed out"
  }
  assert.equal(nextParks({}, "ses_wait", titleError), null)
  assert.equal(nextParks({}, "ses_wait", titleError, "completion"), null)
  assert.equal(
    nextParks({ ses_wait: park() }, "ses_wait", titleError, "completion"),
    null
  )
})

test("没有 park 时回挂对不上落停车，running 收回且不写 error", () => {
  const next = nextParks({}, "ses_wait", {
    type: "run.error",
    runId: "run_wait",
    message: "restore_no_matching_approval"
  })
  assert.equal(next?.ses_wait?.running, false)
  assert.equal(next?.ses_wait?.error, null)
})

test("切走后才返回的 runId 认领进停车，不 idle", () => {
  const next = attachParkedRunId(park({ runId: null }), "run_late")
  assert.equal(next.runId, "run_late")
  assert.equal(next.running, true)
  assert.equal(idleComposerPatch().running, false)
})
