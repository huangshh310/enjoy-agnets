import assert from "node:assert/strict"
import { test } from "node:test"
import { openAcpSession } from "./acp-open-session.ts"

test("有 resume 能力且成功则 resumed", async () => {
  const result = await openAcpSession({
    resumeId: "acp_1",
    canResume: true,
    resume: async (id) => id,
    create: async () => "new"
  })
  assert.deepEqual(result, { sessionId: "acp_1", resumed: true })
})

test("resume 失败回落 new 且 resumed=false", async () => {
  const result = await openAcpSession({
    resumeId: "gone",
    canResume: true,
    resume: async () => {
      throw new Error("unknown session")
    },
    create: async () => "new_1"
  })
  assert.deepEqual(result, { sessionId: "new_1", resumed: false })
})

test("未广告 resume 直接 new", async () => {
  const result = await openAcpSession({
    resumeId: "acp_1",
    canResume: false,
    resume: async () => "should-not",
    create: async () => "new_2"
  })
  assert.deepEqual(result, { sessionId: "new_2", resumed: false })
})
