import assert from "node:assert/strict"
import { test } from "node:test"
import {
  applyEventToPark,
  attachParkedRunId,
  captureParkedRun,
  idleComposerPatch
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

test("切走后才返回的 runId 认领进停车，不 idle", () => {
  const next = attachParkedRunId(park({ runId: null }), "run_late")
  assert.equal(next.runId, "run_late")
  assert.equal(next.running, true)
  assert.equal(idleComposerPatch().running, false)
})
