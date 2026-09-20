import assert from "node:assert/strict"
import { test } from "node:test"
import { foldToolEvent } from "./fold-tool-event.ts"
import type { ThreadToolCall } from "./assistant-payload.ts"

test("探索 deny 的 tool.result error 折成 output-error", () => {
  const tools: ThreadToolCall[] = []
  foldToolEvent(tools, {
    type: "tool.result",
    runId: "r1",
    toolCallId: "t1",
    name: "write_file",
    args: { path: "src/a.ts" },
    error: "Explore mode is read-only."
  })
  assert.equal(tools[0]?.state, "output-error")
  assert.equal(tools[0]?.errorText, "Explore mode is read-only.")
})
