import assert from "node:assert/strict"
import { test } from "node:test"
import { pendingAssistantStamp } from "./pending-assistant-stamp.ts"

test("乐观泡 stamp 会话覆盖，不读上一会话模型", () => {
  const stamp = pendingAssistantStamp({
    runtimeId: "claude",
    modelId: "sonnet",
    modelLabel: "Sonnet 4",
    sessionId: "s1",
    sessionModels: { s1: "opus", s0: "haiku" }
  })
  assert.equal(stamp.runtimeId, "claude")
  assert.equal(stamp.modelId, "opus")
})

test("luna P2-2：runModelId 跟这一发 agent.run（如 cli:amp）时盖它；标签只在同 store.modelId 才盖", () => {
  const store = {
    runtimeId: "amp",
    modelId: "stub-e2e",
    modelLabel: "E2E Stub",
    sessionId: "s1",
    sessionModels: {}
  }
  const amp = pendingAssistantStamp(store, "cli:amp")
  assert.equal(amp.runtimeId, "amp")
  assert.equal(amp.modelId, "cli:amp")
  assert.equal(amp.modelLabel, undefined)

  const local = pendingAssistantStamp(
    { ...store, runtimeId: "enjoy-local" },
    "stub-e2e"
  )
  assert.equal(local.modelId, "stub-e2e")
  assert.equal(local.modelLabel, "E2E Stub")
})
