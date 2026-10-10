import assert from "node:assert/strict"
import { test } from "node:test"
import { mapAcpToolEvents } from "./map-acp-tool.ts"

test("ACP kind:move 在 path 启发式之前映射成写类，不会落成 read_file", () => {
  const events = mapAcpToolEvents(
    "tool_call",
    {
      toolCallId: "tc_move",
      kind: "move",
      title: "Move file",
      rawInput: { path: "notes.md" }
    },
    "run_1"
  )
  const start = events.find((event) => event.type === "tool.start")
  assert.ok(start && start.type === "tool.start")
  assert.equal(start.name, "edit_file")
  assert.notEqual(start.name, "read_file")
})
