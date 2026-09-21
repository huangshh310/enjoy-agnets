import assert from "node:assert/strict"
import { test } from "node:test"
import { needsQuitConfirm } from "./quit-guard.ts"

test("空闲不拦", () => {
  assert.equal(needsQuitConfirm({ running: false, pendingApproval: null }), false)
})

test("当前在跑或等审批要拦", () => {
  assert.equal(needsQuitConfirm({ running: true, pendingApproval: null }), true)
  assert.equal(needsQuitConfirm({ running: false, pendingApproval: { id: "a" } }), true)
})

test("后台停车或 Attention 审批要拦", () => {
  assert.equal(
    needsQuitConfirm({
      running: false,
      pendingApproval: null,
      parks: { s: { running: true, pendingApproval: null } }
    }),
    true
  )
  assert.equal(
    needsQuitConfirm({
      running: false,
      pendingApproval: null,
      attention: [{ kind: "pending_approval", status: "active" }]
    }),
    true
  )
  assert.equal(
    needsQuitConfirm({
      running: false,
      pendingApproval: null,
      attention: [{ kind: "complete", status: "active" }]
    }),
    false
  )
})
