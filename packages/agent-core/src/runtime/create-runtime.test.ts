import assert from "node:assert/strict"
import { test } from "node:test"
import { createBufferedRuntime } from "./create-runtime.ts"
import { createEventBuffer } from "./event-buffer.ts"

test("AiRuntime.stream 按序吐出 execute 发出的事件", async () => {
  const runtime = createBufferedRuntime({
    createRunId: () => "run_mem",
    async execute({ emit, request }) {
      emit({ type: "text.delta", runId: "run_mem", text: request.prompt ?? "" })
      emit({ type: "run.end", runId: "run_mem" })
    }
  })
  const { runId } = await runtime.start({
    kind: "text",
    sessionId: "ses_1",
    modelId: "stub",
    prompt: "hi"
  })
  const types: string[] = []
  for await (const event of runtime.stream(runId)) {
    types.push(event.type)
  }
  assert.deepEqual(types, ["text.delta", "run.end"])
})

test("event buffer 超出上限仍按 sequence 不乱序", () => {
  const buffer = createEventBuffer(8)
  for (let index = 0; index < 20; index += 1) {
    buffer.push({
      type: "text.delta",
      runId: "cap",
      text: String(index),
      sequence: index + 1,
      timestamp: index
    })
  }
  const listed = buffer.list({ runId: "cap" })
  assert.equal(listed.length, 8)
  const sequences = listed.map((event) => event.sequence)
  assert.deepEqual(sequences, [...sequences].sort((left, right) => (left ?? 0) - (right ?? 0)))
})

test("event buffer 按 runId 过滤并保留 sequence 顺序", () => {
  const buffer = createEventBuffer()
  buffer.push({ type: "text.delta", runId: "a", text: "1", sequence: 2, timestamp: 2 })
  buffer.push({ type: "text.delta", runId: "b", text: "x", sequence: 1, timestamp: 1 })
  buffer.push({ type: "text.delta", runId: "a", text: "2", sequence: 1, timestamp: 1 })
  const listed = buffer.list({ runId: "a" })
  assert.equal(listed.map((event) => "text" in event ? event.text : "").join(""), "21")
})
