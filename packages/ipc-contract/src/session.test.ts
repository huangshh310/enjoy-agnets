import assert from "node:assert/strict"
import { test } from "node:test"
import { SessionIdInput, SessionRenameInput } from "./session.ts"

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
