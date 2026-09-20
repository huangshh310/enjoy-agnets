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
