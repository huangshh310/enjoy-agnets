import assert from "node:assert/strict"
import { test } from "node:test"
import { acceptStreamEvent } from "./accept-stream-event.ts"

test("合法 StreamEvent 放行", () => {
  const event = acceptStreamEvent({ type: "text.delta", runId: "r1", text: "hi" })
  assert.deepEqual(event, { type: "text.delta", runId: "r1", text: "hi" })
})

test("未知 type 丢掉", () => {
  assert.equal(acceptStreamEvent({ type: "not.a.thing", runId: "r1" }), null)
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

test("run.end / run.error 的 turn 过 safeParse，不会被剥掉", () => {
  const end = acceptStreamEvent({
    type: "run.end",
    runId: "r1",
    turn: { workflow: "todo", attention: "complete" }
  })
  assert.equal(end?.type, "run.end")
  if (end?.type === "run.end") {
    assert.deepEqual(end.turn, { workflow: "todo", attention: "complete" })
  }
  const error = acceptStreamEvent({
    type: "run.error",
    runId: "r1",
    message: "INTERNAL_STORE_ERROR",
    turn: { workflow: "in_progress", attention: "error" }
  })
  assert.equal(error?.type, "run.error")
  if (error?.type === "run.error") {
    assert.deepEqual(error.turn, { workflow: "in_progress", attention: "error" })
  }
  const denied = acceptStreamEvent({
    type: "run.end",
    runId: "r1",
    turn: { workflow: "todo", attention: "neutral" }
  })
  assert.equal(denied?.type, "run.end")
  if (denied?.type === "run.end") assert.equal(denied.turn?.attention, "neutral")
})

test("approval.required 缺 args 仍过闸，不丢掉整条", () => {
  const event = acceptStreamEvent({
    type: "approval.required",
    runId: "r1",
    toolCallId: "tool_1",
    approvalId: "apr_1",
    name: "write_file"
  })
  assert.equal(event?.type, "approval.required")
  if (event?.type === "approval.required") {
    assert.equal(event.name, "write_file")
    assert.equal(event.args, undefined)
  }
})
