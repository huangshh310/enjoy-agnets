import assert from "node:assert/strict"
import { test } from "node:test"
import { applyPreferredRuntime } from "./persist-preferred-runtime.ts"

test("asDefault 写 preferredRuntimeId，即使已经是这台引擎", () => {
  const store = { preferredRuntimeId: "enjoy-local", setPreferredRuntimeId(id: string) {
    this.preferredRuntimeId = id
  } }
  applyPreferredRuntime(store, "claude")
  assert.equal(store.preferredRuntimeId, "claude")
  applyPreferredRuntime(store, "claude")
  assert.equal(store.preferredRuntimeId, "claude")
})
