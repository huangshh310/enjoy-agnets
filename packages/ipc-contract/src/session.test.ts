import assert from "node:assert/strict"
import { test } from "node:test"
import { SessionIdInput, SessionPatchInput, SessionRenameInput } from "./session.ts"

test("session.rename 拒绝未知字段", () => {
  assert.equal(
    SessionRenameInput.safeParse({ sessionId: "s1", title: "ok", extra: true }).success,
    false
  )
})

test("session.rename 接受合法标题", () => {
  assert.equal(SessionRenameInput.safeParse({ sessionId: "s1", title: "Fix login" }).success, true)
})

test("session.archive 入参只要 sessionId", () => {
  assert.equal(SessionIdInput.safeParse({ sessionId: "s1" }).success, true)
  assert.equal(SessionIdInput.safeParse({ sessionId: "s1", extra: 1 }).success, false)
})

test("session.patch 要求至少提供一个修改字段", () => {
  assert.equal(SessionPatchInput.safeParse({ id: "s1" }).success, false)
  assert.equal(SessionPatchInput.safeParse({ id: "s1", flagged: true }).success, true)
  assert.equal(SessionPatchInput.safeParse({ id: "s1", workflowStatus: "in_progress" }).success, true)
  assert.equal(SessionPatchInput.safeParse({ id: "s1", workflowStatus: "unknown" }).success, false)
  assert.equal(SessionPatchInput.safeParse({ id: "s1", goal: "完成所有工作" }).success, true)
  assert.equal(SessionPatchInput.safeParse({ id: "s1", recap: "上下文记忆" }).success, true)
})
