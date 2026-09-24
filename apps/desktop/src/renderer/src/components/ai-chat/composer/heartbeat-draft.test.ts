import assert from "node:assert/strict"
import { test } from "node:test"
import { draftFromHeartbeat, emptyHeartbeatDraft } from "./heartbeat-draft.ts"

test("没有心跳行时草稿清空，避免串到下一条会话", () => {
  assert.deepEqual(draftFromHeartbeat(null), emptyHeartbeatDraft())
})

test("停用的心跳仍占这一条，停止按钮可以删掉它", () => {
  const draft = draftFromHeartbeat({
    id: "hb_1",
    sessionId: "ses_1",
    cronExpr: "0 9 * * *",
    timeZone: "Asia/Shanghai",
    prompt: "看构建",
    maxRuns: 3,
    runCount: 3,
    enabled: false,
    lastRunAt: 1
  })
  assert.equal(draft.active, true)
  assert.equal(draft.paused, true)
  assert.equal(draft.timeZone, "Asia/Shanghai")
  assert.equal(draft.maxRuns, "3")
})
