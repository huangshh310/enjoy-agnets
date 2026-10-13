import assert from "node:assert/strict"
import { test } from "node:test"
import { retryTargetFromMessages } from "./hydrate-session-error.ts"

test("重试目标绑最后一条用户话", () => {
  assert.deepEqual(
    retryTargetFromMessages("ses_1", [
      { id: "u1", role: "user", content: "先发" },
      { id: "a1", role: "assistant", content: "" },
      { id: "u2", role: "user", content: "后发" }
    ]),
    { kind: "regenerate", sessionId: "ses_1", userId: "u2" }
  )
  assert.equal(retryTargetFromMessages("ses_1", [{ id: "a1", role: "assistant", content: "x" }]), null)
})
