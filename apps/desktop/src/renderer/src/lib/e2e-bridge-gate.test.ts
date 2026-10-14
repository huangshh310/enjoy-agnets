import assert from "node:assert/strict"
import { test } from "node:test"
import { e2eStubEnabled, gateE2eStubMembers, publishE2eBridge } from "./e2e-bridge-gate.ts"

const make = () => ({ getComposerGate: () => null, runWithClientRequestId: () => null, focusSession: () => null })

test("非 e2e stub：runWithClientRequestId / focusSession 不暴露，其它成员保留", () => {
  const b = gateE2eStubMembers(make(), false)
  assert.equal("runWithClientRequestId" in b, false)
  assert.equal("focusSession" in b, false)
  assert.equal(typeof b.getComposerGate, "function")
})

test("e2e stub：全部保留；标记只认 === true", () => {
  const b = gateE2eStubMembers(make(), true)
  assert.equal(typeof b.runWithClientRequestId, "function")
  assert.equal(typeof b.focusSession, "function")
  assert.equal(e2eStubEnabled({ enjoyE2eStub: true }), true)
  assert.equal(e2eStubEnabled({ enjoyE2eStub: "1" }), false)
  assert.equal(e2eStubEnabled(undefined), false)
})

test("installEnjoyE2eBridge 挂到 window：非 stub 窗口拿不到 stub-only 成员；stub 窗口拿得到", () => {
  const plain: { __enjoyE2e?: Record<string, unknown> } = {}
  publishE2eBridge(plain, make())
  assert.equal(typeof plain.__enjoyE2e?.getComposerGate, "function")
  assert.equal(plain.__enjoyE2e?.runWithClientRequestId, undefined)
  assert.equal(plain.__enjoyE2e?.focusSession, undefined)
  const stub: { __enjoyE2e?: Record<string, unknown>; enjoyE2eStub: boolean } = { enjoyE2eStub: true }
  publishE2eBridge(stub, make())
  assert.equal(typeof stub.__enjoyE2e?.runWithClientRequestId, "function")
  assert.equal(typeof stub.__enjoyE2e?.focusSession, "function")
})
