import assert from "node:assert/strict"
import { test } from "node:test"
import { orderReplayEvents, summarizeReplayEvents, summarizeTraceEvents } from "./replay.ts"

test("按 sequence 重放，不乱序", () => {
  const ordered = orderReplayEvents([
    { sequence: 3, timestamp: 1 },
    { sequence: 1, timestamp: 9 },
    { sequence: 2, timestamp: 2 }
  ])
  assert.deepEqual(
    ordered.map((item) => item.sequence),
    [1, 2, 3]
  )
})

test("千条乱序事件按 sequence 排回且不丢", () => {
  const input = Array.from({ length: 1000 }, (_, index) => ({
    sequence: 1000 - index,
    timestamp: index
  }))
  const ordered = orderReplayEvents(input)
  assert.equal(ordered.length, 1000)
  assert.equal(ordered[0]?.sequence, 1)
  assert.equal(ordered.at(-1)?.sequence, 1000)
})

test("回放摘要不含 delta 或工具参数", () => {
  const summary = summarizeReplayEvents([
    {
      type: "text.delta",
      runId: "run_1",
      sequence: 1,
      timestamp: 10,
      text: "secret prompt"
    } as { type: string; runId?: string; sequence?: number; timestamp?: number }
  ])
  assert.deepEqual(summary, [{ type: "text.delta", runId: "run_1", sequence: 1, timestamp: 10 }])
  assert.equal(JSON.stringify(summary).includes("secret"), false)
})

test("Trace 摘要带工具名但不带 args", () => {
  const events = summarizeTraceEvents([
    {
      type: "tool.start",
      runId: "run_1",
      name: "bash",
      args: { command: "secret" },
      sequence: 2,
      timestamp: 20
    },
    {
      type: "text.delta",
      runId: "run_1",
      text: "hello",
      sequence: 3,
      timestamp: 21
    }
  ] as Array<{ type: string; runId?: string; name?: string; sequence?: number; timestamp?: number }>)
  assert.equal(events.length, 1)
  assert.equal(events[0]?.toolName, "bash")
  assert.equal(JSON.stringify(events).includes("secret"), false)
})
