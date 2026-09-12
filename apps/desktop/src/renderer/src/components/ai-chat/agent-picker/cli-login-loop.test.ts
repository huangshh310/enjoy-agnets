import assert from "node:assert/strict"
import { test } from "node:test"
import { getCliLoginLoop, resetCliLoginLoopStore, useCliLoginLoopStore } from "./cli-login-loop.ts"

test("begin 是授权中，succeed 才清掉；fail 留下原因", () => {
  resetCliLoginLoopStore()
  const store = useCliLoginLoopStore.getState()
  store.begin("cursor")
  assert.equal(getCliLoginLoop("cursor").phase, "authorizing")
  store.fail("cursor", "callback_timeout")
  assert.deepEqual(getCliLoginLoop("cursor"), { phase: "failed", reason: "callback_timeout" })
  store.succeed("cursor")
  assert.equal(getCliLoginLoop("cursor").phase, "idle")
  resetCliLoginLoopStore()
})
