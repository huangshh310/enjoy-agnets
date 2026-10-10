import assert from "node:assert/strict"
import { test } from "node:test"
import { selectForkTurns, visibleSessionTurns } from "./session-fork.ts"
import { SessionHeartbeatPutInput } from "./session-heartbeat.ts"
import {
  SessionForkInput,
  SessionIdInput,
  SessionPatchInput,
  SessionRenameInput,
  SessionSetFocusedInput,
  SessionTruncateFromInput
} from "./session.ts"

test("session.rename 拒绝未知字段", () => {
  assert.equal(
    SessionRenameInput.safeParse({ sessionId: "s1", title: "ok", extra: true }).success,
    false
  )
})

test("session.rename 接受合法标题", () => {
  assert.equal(SessionRenameInput.safeParse({ sessionId: "s1", title: "Fix login" }).success, true)
})

test("session.setFocused 只要可空 sessionId", () => {
  assert.equal(SessionSetFocusedInput.safeParse({ sessionId: "s1" }).success, true)
  assert.equal(SessionSetFocusedInput.safeParse({ sessionId: null }).success, true)
  assert.equal(SessionSetFocusedInput.safeParse({ sessionId: "" }).success, false)
  assert.equal(SessionSetFocusedInput.safeParse({ sessionId: "s1", extra: 1 }).success, false)
  assert.equal(SessionSetFocusedInput.safeParse({}).success, false)
})

test("session.archive 入参只要 sessionId", () => {
  assert.equal(SessionIdInput.safeParse({ sessionId: "s1" }).success, true)
  assert.equal(SessionIdInput.safeParse({ sessionId: "s1", extra: 1 }).success, false)
})

test("session.truncateFrom 只要 sessionId + messageId", () => {
  assert.equal(
    SessionTruncateFromInput.safeParse({ sessionId: "s1", messageId: "m1" }).success,
    true
  )
  assert.equal(
    SessionTruncateFromInput.safeParse({ sessionId: "s1", messageId: "m1", extra: true }).success,
    false
  )
})

test("session.fork 只要 sessionId + messageId", () => {
  assert.equal(SessionForkInput.safeParse({ sessionId: "s1", messageId: "m1" }).success, true)
  assert.equal(SessionForkInput.safeParse({ sessionId: "s1", messageId: "m1", extra: 1 }).success, false)
})

test("selectForkTurns 剥围栏，停在目标助手轮", () => {
  const selected = selectForkTurns(
    [
      { id: "u1", role: "user", content: "[Enjoy host mode: plan]\n只读。\n[/Enjoy host mode]\n\n先看登录" },
      { id: "a1", role: "assistant", content: "登录在 auth.ts。\n\n:::enjoy-actions\n- [queue] 补测试: 请补单测\n:::" },
      { id: "u2", role: "user", content: "下一句" }
    ],
    "a1"
  )
  assert.equal(selected.ok, true)
  if (!selected.ok) return
  assert.deepEqual(selected.turns, [
    { role: "user", content: "先看登录" },
    { role: "assistant", content: "登录在 auth.ts。" }
  ])
})

test("visibleSessionTurns 留下心跳可以带上的可见轮次", () => {
  assert.deepEqual(
    visibleSessionTurns([
      { id: "u1", role: "user", content: "先看登录" },
      { id: "a1", role: "assistant", content: "在 auth.ts" }
    ]),
    [
      { role: "user", content: "先看登录" },
      { role: "assistant", content: "在 auth.ts" }
    ]
  )
})

test("selectForkTurns 空助手轮失败", () => {
  const selected = selectForkTurns([{ id: "a1", role: "assistant", content: "   " }], "a1")
  assert.deepEqual(selected, { ok: false, code: "FORK_EMPTY" })
})

test("心跳 cron 与 prompt 必填，多余字段拒绝", () => {
  assert.equal(
    SessionHeartbeatPutInput.safeParse({ sessionId: "s1", cronExpr: "0 9 * * *", prompt: "看构建" }).success,
    true
  )
  assert.equal(
    SessionHeartbeatPutInput.safeParse({ sessionId: "s1", cronExpr: "0 9 * * *", prompt: "看构建", extra: 1 }).success,
    false
  )
})

test("session.patch 要求至少提供一个修改字段", () => {
  assert.equal(SessionPatchInput.safeParse({ id: "s1" }).success, false)
  assert.equal(SessionPatchInput.safeParse({ id: "s1", flagged: true }).success, true)
  assert.equal(SessionPatchInput.safeParse({ id: "s1", workflowStatus: "in_progress" }).success, true)
  assert.equal(SessionPatchInput.safeParse({ id: "s1", workflowStatus: "unknown" }).success, false)
  assert.equal(SessionPatchInput.safeParse({ id: "s1", goal: "完成所有工作" }).success, true)
  assert.equal(SessionPatchInput.safeParse({ id: "s1", recap: "上下文记忆" }).success, true)
})
