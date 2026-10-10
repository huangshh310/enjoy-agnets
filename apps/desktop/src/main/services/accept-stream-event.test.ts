import assert from "node:assert/strict"
import { test } from "node:test"
import {
  acceptStreamEvent,
  resetStreamEventDropStats,
  streamEventDropCount
} from "./accept-stream-event.ts"

test("合法 StreamEvent 放行", () => {
  const event = acceptStreamEvent({ type: "text.delta", runId: "r1", text: "hi" })
  assert.deepEqual(event, { type: "text.delta", runId: "r1", text: "hi" })
})

test("未知 type 丢掉并计数", () => {
  resetStreamEventDropStats()
  assert.equal(acceptStreamEvent({ type: "not.a.thing", runId: "r1" }), null)
  assert.equal(streamEventDropCount("not.a.thing"), 1)
  assert.equal(acceptStreamEvent({ type: "not.a.thing", runId: "r1" }), null)
  assert.equal(streamEventDropCount("not.a.thing"), 2)
})

test("event-bus 丢掉时不得把原事件当已发送", () => {
  const raw = { type: "mcp.app", runId: "r1", serverId: "acp", resourceUri: "ui://x", phase: "open", title: "T".repeat(201) }
  assert.equal(acceptStreamEvent(raw), null)
})

test("#126/#127 出站事件仍过 safeParse，不会被闸丢掉", () => {
  assert.deepEqual(
    acceptStreamEvent({
      type: "approval.resolved",
      runId: "r1",
      toolCallId: "tool_1",
      decision: "allow"
    }),
    { type: "approval.resolved", runId: "r1", toolCallId: "tool_1", decision: "allow" }
  )
  assert.deepEqual(
    acceptStreamEvent({
      type: "run.start",
      runId: "r1",
      sessionId: "s1",
      prompt: "hello"
    }),
    { type: "run.start", runId: "r1", sessionId: "s1", prompt: "hello" }
  )
  const result = acceptStreamEvent({
    type: "tool.result",
    runId: "r1",
    toolCallId: "tool_1",
    name: "write_file",
    error: "No result received."
  })
  assert.equal(result?.type, "tool.result")
  if (result?.type === "tool.result") assert.equal(result.error, "No result received.")
})
