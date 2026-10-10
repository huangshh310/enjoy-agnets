/**
 * 归档会话 A 不得取消会话 B 的在途 desktop_act。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { shouldCancelInFlightDesktopAct } from "./desktop-act-cancel.ts"

test("按 run / session 限定：A 的归档不取消 B", () => {
  const ownerB = { sessionId: "ses_b", runId: "run_b" }
  assert.equal(shouldCancelInFlightDesktopAct(ownerB, { sessionId: "ses_a" }), false)
  assert.equal(shouldCancelInFlightDesktopAct(ownerB, { runId: "run_a" }), false)
  assert.equal(shouldCancelInFlightDesktopAct(ownerB, { sessionId: "ses_b", runId: "run_b" }), true)
})

test("没有范围或没有属主：保持原取消", () => {
  assert.equal(shouldCancelInFlightDesktopAct({ runId: "run_b" }), true)
  assert.equal(shouldCancelInFlightDesktopAct(null, { sessionId: "ses_a" }), true)
})
