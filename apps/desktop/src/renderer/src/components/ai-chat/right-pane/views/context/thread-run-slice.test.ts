import assert from "node:assert/strict"
import { test } from "node:test"
import {
  citedSourcesFromMessages,
  toolRunKind,
  toolsFromMessages
} from "./thread-run-slice.ts"

test("citedSourcesFromMessages only takes assistant sources", () => {
  const sources = citedSourcesFromMessages([
    { role: "user", sources: [{ sourceId: "x", title: "no", path: "x" }] },
    {
      role: "assistant",
      sources: [{ sourceId: "a", title: "A", path: "a.md" }]
    }
  ])
  assert.equal(sources.length, 1)
  assert.equal(sources[0]?.path, "a.md")
})

test("toolsFromMessages keeps recent assistant tools", () => {
  const tools = toolsFromMessages([
    { role: "assistant", tools: [{ id: "1", name: "read_file", state: "output-available" }] }
  ])
  assert.equal(tools[0]?.name, "read_file")
})

test("toolRunKind maps SDK states", () => {
  assert.equal(toolRunKind("output-available"), "ok")
  assert.equal(toolRunKind("output-error"), "error")
  assert.equal(toolRunKind("output-denied"), "denied")
  assert.equal(toolRunKind("approval-requested"), "running")
  assert.equal(
    toolRunKind("output-error", {
      state: "output-error",
      result: { code: "APPROVAL_REPLAY_DENIED" }
    }),
    "denied"
  )
  assert.equal(
    toolRunKind("output-error", {
      state: "output-error",
      errorText: "user_aborted"
    }),
    "stopped"
  )
})
