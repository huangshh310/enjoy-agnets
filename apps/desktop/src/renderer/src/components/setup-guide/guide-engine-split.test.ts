import assert from "node:assert/strict"
import { test } from "node:test"
import { splitGuideEngines } from "./guide-engine-split.ts"

test("常见四家钉在上面，其余进更多", () => {
  const tools = [
    { id: "enjoy-local" },
    { id: "claude" },
    { id: "cursor" },
    { id: "grok" },
    { id: "codex" },
    { id: "gemini" }
  ]
  const { pinned, more } = splitGuideEngines(tools)
  assert.deepEqual(
    pinned.map((row) => row.id),
    ["enjoy-local", "claude", "cursor", "codex"]
  )
  assert.deepEqual(
    more.map((row) => row.id),
    ["grok", "gemini"]
  )
})

test("名单里没有钉住的就全部进更多", () => {
  const { pinned, more } = splitGuideEngines([{ id: "hermes" }, { id: "amp" }])
  assert.deepEqual(pinned, [])
  assert.equal(more.length, 2)
})
