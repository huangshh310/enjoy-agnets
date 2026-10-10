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

test("当前会话仍 running 且尚未认领 runId 时，同 session 的 Composer run.start 归前台", () => {
  assert.equal(
    belongsToForeground(
      { type: "run.start", runId: "run_a", sessionId: "ses_a", kind: "agent" },
      "ses_a",
      null,
      true,
      "ses_a"
    ),
    true
  )
})

test("空闲时 kind=agent 的 run.start 仍归前台（续跑 / 恢复）", () => {
  assert.equal(
    belongsToForeground(
      { type: "run.start", runId: "run_restore", sessionId: "ses_a", kind: "agent" },
      "ses_a",
      null,
      false,
      "ses_a"
    ),
    true
  )
})

test("当前会话出字前失败即使空闲也归前台", () => {
  assert.equal(
    belongsToForeground(
      {
        type: "run.error",
        runId: "run_fail",
        message: "provider_unreachable",
        code: "provider_unreachable",
        preOutput: true
      },
      "ses_a",
      null,
      false,
      "ses_a"
    ),
    true
  )
})

test("主 run 结束后标题补全 run.start 不归前台", () => {
  assert.equal(
    belongsToForeground(
      { type: "run.start", runId: "run_title", sessionId: "ses_a", kind: "completion" },
      "ses_a",
      null,
      false,
      "ses_a"
    ),
    false
  )
})
