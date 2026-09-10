import assert from "node:assert/strict"
import { test } from "node:test"
import { acpChildStillAlive } from "./acp-child-alive.ts"

test("没退出就还活着；发过信号但未退出也算活着", () => {
  assert.equal(acpChildStillAlive({ exitCode: null, signalCode: null }), true)
  assert.equal(acpChildStillAlive({ exitCode: 0, signalCode: null }), false)
  assert.equal(acpChildStillAlive({ exitCode: null, signalCode: "SIGTERM" }), false)
})
