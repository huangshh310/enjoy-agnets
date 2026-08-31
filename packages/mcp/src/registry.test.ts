import assert from "node:assert/strict"
import { test } from "node:test"
import { createMcpHandleRegistry } from "./registry.ts"

test("close 会关掉句柄并移除注册", () => {
  const registry = createMcpHandleRegistry()
  let closed = 0
  registry.set("s1", { id: "s1", state: "connected", close: () => { closed += 1 } })
  assert.equal(registry.listConnected().length, 1)
  registry.close("s1")
  assert.equal(closed, 1)
  assert.equal(registry.get("s1"), undefined)
})
