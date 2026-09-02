import assert from "node:assert/strict"
import { test } from "node:test"
import {
  addSessionContextChip,
  formatContextChipsForSend,
  listSessionContextChips,
  takeSessionContextChips
} from "./session-context-chips.ts"

test("add replaces same id and take clears", () => {
  takeSessionContextChips()
  addSessionContextChip({
    id: "c1",
    kind: "knowledge",
    label: "readme.md",
    path: "readme.md",
    snippet: "hello"
  })
  addSessionContextChip({
    id: "c1",
    kind: "knowledge",
    label: "readme.md",
    path: "readme.md",
    snippet: "hello2"
  })
  assert.equal(listSessionContextChips().length, 1)
  assert.equal(takeSessionContextChips()[0]?.snippet, "hello2")
  assert.equal(listSessionContextChips().length, 0)
})

test("formatContextChipsForSend skips empty snippets", () => {
  const text = formatContextChipsForSend([
    { id: "a", kind: "knowledge", label: "a.md", path: "a.md", snippet: "  pin  " },
    { id: "b", kind: "knowledge", label: "b.md" }
  ])
  assert.equal(text, "> a.md\npin")
})
