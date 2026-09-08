import assert from "node:assert/strict"
import { test } from "node:test"
import { DEFAULT_RUNTIME_ID, pickSessionRuntime } from "./session-runtime.ts"

test("有会话覆盖时用该会话的 runtime，不跟 Composer 当前选择", () => {
  assert.equal(
    pickSessionRuntime("s1", { s1: "cursor", s2: "claude" }, "grok"),
    "cursor"
  )
})

test("无覆盖时回落偏好，再回落 Enjoy 本地", () => {
  assert.equal(pickSessionRuntime("s1", {}, "cursor"), "cursor")
  assert.equal(pickSessionRuntime("s1", {}, undefined), DEFAULT_RUNTIME_ID)
  assert.equal(pickSessionRuntime("s1", {}, ""), DEFAULT_RUNTIME_ID)
  assert.equal(pickSessionRuntime(null, { s1: "cursor" }, "claude"), "claude")
})
