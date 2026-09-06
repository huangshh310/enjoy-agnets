import assert from "node:assert/strict"
import { test } from "node:test"
import { mapAcpUpdate } from "./map-events.ts"
import { pickAcpPermissionOption } from "./permissions.ts"

test("maps thought and message chunks", () => {
  assert.deepEqual(
    mapAcpUpdate({ sessionUpdate: "agent_thought_chunk", content: { type: "text", text: "先想" } }, "run_1"),
    [{ type: "reasoning.delta", runId: "run_1", text: "先想" }]
  )
  assert.deepEqual(
    mapAcpUpdate({ sessionUpdate: "agent_message_chunk", content: { text: "你好" } }, "run_1"),
    [{ type: "text.delta", runId: "run_1", text: "你好" }]
  )
})

test("maps tool call and path locations", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "tool_call",
      toolCallId: "t1",
      title: "edit",
      rawInput: { path: "a.ts" },
      locations: [{ path: "a.ts" }]
    },
    "run_1"
  )
  assert.equal(events[0]?.type, "tool.start")
  assert.equal(events[1]?.type, "file.changed")
})

test("无 title 但有 locations 时推断为 edit_file，不要当成 read_file", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "tool_call",
      toolCallId: "t2",
      rawInput: { path: "b.ts" },
      locations: [{ path: "b.ts" }]
    },
    "run_1"
  )
  const start = events[0]
  assert.equal(start?.type, "tool.start")
  if (start?.type === "tool.start") assert.equal(start.name, "edit_file")
})

test("permission options map allow / deny / session", () => {
  const options = [
    { optionId: "allow-once", kind: "allow_once" },
    { optionId: "allow-always", kind: "allow_always" },
    { optionId: "reject-once", kind: "reject_once" }
  ]
  assert.deepEqual(pickAcpPermissionOption("allow", options), {
    outcome: "selected",
    optionId: "allow-once"
  })
  assert.deepEqual(pickAcpPermissionOption("allow_session", options), {
    outcome: "selected",
    optionId: "allow-always"
  })
  assert.deepEqual(pickAcpPermissionOption("deny", options), {
    outcome: "selected",
    optionId: "reject-once"
  })
})
