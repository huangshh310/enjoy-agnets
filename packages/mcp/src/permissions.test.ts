import assert from "node:assert/strict"
import { test } from "node:test"
import { decideMcpCall, defaultLevel, mcpCallAction } from "./permissions.ts"

test("未信任 Server 默认 ask / deny", () => {
  assert.equal(defaultLevel(false, "server"), "ask")
  assert.equal(defaultLevel(false, "tool"), "deny")
})

test("写操作即使 allow 也要再确认", () => {
  assert.equal(decideMcpCall({ trusted: true, level: "allow", mutating: true }), "ask")
  assert.equal(decideMcpCall({ trusted: true, level: "allow", mutating: false }), "allow")
})

test("ask 不得直接执行，必须等待审批", () => {
  assert.equal(mcpCallAction("deny"), "deny")
  assert.equal(mcpCallAction("ask"), "wait")
  assert.equal(mcpCallAction("allow"), "run")
})
