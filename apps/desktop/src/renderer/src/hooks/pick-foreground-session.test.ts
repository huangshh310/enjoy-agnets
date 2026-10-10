import assert from "node:assert/strict"
import { test } from "node:test"
import { pickForegroundSession } from "./pick-foreground-session.ts"

test("当前会话还在名单里：打开它", () => {
  const sessions = [
    { id: "ses_old", title: "旧" },
    { id: "ses_new", title: "新对话" }
  ]
  assert.deepEqual(pickForegroundSession(sessions, "ses_new"), sessions[1])
})

test("刚创建、名单还是旧快照：保持当前，不退回 sessions[0]", () => {
  const sessions = [{ id: "ses_old", title: "旧" }]
  assert.equal(pickForegroundSession(sessions, "ses_new"), "keep")
})

test("没有当前会话：回落最近一条或新建", () => {
  const sessions = [{ id: "ses_old", title: "旧" }]
  assert.deepEqual(pickForegroundSession(sessions, null), sessions[0])
  assert.equal(pickForegroundSession([], null), "create")
})
