import assert from "node:assert/strict"
import { test } from "node:test"
import { DEFAULT_RUNTIME_ID, pickSessionRuntime, sessionSwitchComposerReset } from "./session-runtime.ts"

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

test("两个未绑定会话互切关掉 Picker，不带上一会话引擎", () => {
  const preferred = "enjoy-local"
  const sessionRuntimes = {}
  const fromA = sessionSwitchComposerReset({
    nextSessionId: "b",
    sessionRuntimes,
    preferredRuntimeId: preferred
  })
  assert.equal(fromA.runtimeId, "enjoy-local")
  assert.equal(fromA.agentPickerOpen, false)
  assert.equal(pickSessionRuntime("a", sessionRuntimes, preferred), "enjoy-local")
  assert.equal(pickSessionRuntime("b", sessionRuntimes, preferred), "enjoy-local")
})
