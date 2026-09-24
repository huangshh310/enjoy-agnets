import assert from "node:assert/strict"
import { test } from "node:test"
import { belongsToForeground } from "./foreground-event.ts"

test("前台 runId 命中则吃事件", () => {
  assert.equal(
    belongsToForeground(
      { type: "approval.required", runId: "run_a", toolCallId: "t", approvalId: "a", name: "bash", args: {} },
      "ses_a",
      "run_a",
      true,
      "ses_a"
    ),
    true
  )
})

test("后台会话事件不写进前台线程", () => {
  assert.equal(
    belongsToForeground(
      { type: "approval.required", runId: "run_b", toolCallId: "t", approvalId: "a", name: "bash", args: {} },
      "ses_a",
      "run_a",
      true,
      "ses_b"
    ),
    false
  )
})

test("当前会话空闲时，本会话 run.start 归前台", () => {
  assert.equal(
    belongsToForeground(
      { type: "run.start", runId: "run_hb", sessionId: "ses_a", prompt: "看构建" },
      "ses_a",
      null,
      false,
      "ses_a"
    ),
    true
  )
})

test("当前会话仍 running 且尚未认领 runId 时，同 session 事件归前台", () => {
  assert.equal(
    belongsToForeground(
      { type: "run.start", runId: "run_a", sessionId: "ses_a" },
      "ses_a",
      null,
      true,
      "ses_a"
    ),
    true
  )
})
