import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { handleDismissError } from "./session-dismiss-error-ipc.ts"

test("IPC 把主进程返回值原样传回，并把 sessionId / runId 原样交给主进程", () => {
  const calls: unknown[] = []
  for (const ret of [true, false]) {
    const out = handleDismissError({ sessionId: "s", runId: "r" }, {
      dismiss: (sid, rid) => (calls.push([sid, rid]), ret),
      isE2eStub: () => false,
      env: {}
    })
    assert.equal(out, ret)
  }
  assert.deepEqual(calls, [["s", "r"], ["s", "r"]])
})
test("入参不合法：false，不调主进程", () => {
  let called = false
  assert.equal(handleDismissError({}, { dismiss: () => (called = true), isE2eStub: () => false, env: {} }), false)
  assert.equal(called, false)
})
test("ENJOY_E2E_DISMISS_ERROR=fail 只在 isE2eStub() 时生效；打包版 / 非桩照常落库", () => {
  const env = { ENJOY_E2E_DISMISS_ERROR: "fail" }
  assert.equal(handleDismissError({ sessionId: "s" }, { dismiss: () => true, isE2eStub: () => true, env }), false)
  assert.equal(handleDismissError({ sessionId: "s" }, { dismiss: () => true, isE2eStub: () => false, env }), true)
})
test("ipc-session 用 handleDismissError + isE2eStub 接线", () => {
  const src = readFileSync(new URL("../ipc-session.ts", import.meta.url), "utf8")
  assert.match(src, /handleDismissError\(raw, \{ dismiss: dismissSessionError, isE2eStub \}\)/)
  assert.doesNotMatch(src, /process\.env\.ENJOY_E2E_DISMISS_ERROR/)
})
