import assert from "node:assert/strict"
import { test } from "node:test"
import { StreamEvent, stampStreamEvent } from "./stream-event.ts"

test("旧 run.start / text.delta 仍可 safeParse", () => {
  const start = StreamEvent.safeParse({ type: "run.start", runId: "r1", sessionId: "s1" })
  assert.equal(start.success, true)
  const delta = StreamEvent.safeParse({ type: "text.delta", runId: "r1", text: "hi" })
  assert.equal(delta.success, true)
})

test("v2 事件带 sequence 并可 stamp", () => {
  const stamped = stampStreamEvent(
    { type: "source.added", runId: "r1", sourceId: "k1", title: "a.ts", path: "a.ts" },
    { sequence: 3, sessionId: "s1", timestamp: 10 }
  )
  const parsed = StreamEvent.safeParse(stamped)
  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.equal(parsed.data.type, "source.added")
    assert.equal(parsed.data.sequence, 3)
    assert.equal(parsed.data.sessionId, "s1")
  }
})

test("未知 type 被拒绝", () => {
  const parsed = StreamEvent.safeParse({ type: "not.a.thing", runId: "r1" })
  assert.equal(parsed.success, false)
})

test("v2 事件全集可 safeParse", () => {
  const events = [
    { type: "message.part.start", runId: "r1", partId: "p", partType: "text" },
    { type: "message.part.end", runId: "r1", partId: "p" },
    { type: "structured.delta", runId: "r1", partial: { a: 1 } },
    { type: "asset.created", runId: "r1", assetId: "a", mediaType: "image/png", name: "n", size: 1 },
    { type: "usage.updated", runId: "r1", totalTokens: 8 },
    { type: "step.start", runId: "r1", stepId: "s" },
    { type: "step.end", runId: "r1", stepId: "s" },
    { type: "workflow.checkpoint", runId: "r1", checkpointId: "c", stepIndex: 0 },
    { type: "workflow.paused", runId: "r1" },
    { type: "mcp.tool", runId: "r1", serverId: "m", toolName: "t", phase: "start" },
    { type: "realtime.text", runId: "r1", text: "hi" }
  ]
  for (const event of events) {
    assert.equal(StreamEvent.safeParse(event).success, true, event.type)
  }
})
