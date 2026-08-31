import assert from "node:assert/strict"
import { test } from "node:test"
import { SessionRenameInput } from "./session.ts"

test("session.rename 拒绝未知字段", () => {
  assert.equal(
    SessionRenameInput.safeParse({ sessionId: "s1", title: "ok", extra: true }).success,
    false
  )
})

test("session.rename 接受合法标题", () => {
  assert.equal(SessionRenameInput.safeParse({ sessionId: "s1", title: "Fix login" }).success, true)
})
