import assert from "node:assert/strict"
import { test } from "node:test"
import { createApprovalGate } from "./approval-gate.ts"

test("approval gate wait 被 resolve 后放行", async () => {
  const gate = createApprovalGate()
  const pending = gate.wait("apr_1")
  assert.equal(gate.resolve("apr_1", "allow"), true)
  assert.equal(await pending, "allow")
})

test("没有等待器时 resolve 返回 false", () => {
  const gate = createApprovalGate()
  assert.equal(gate.resolve("missing", "deny"), false)
})
