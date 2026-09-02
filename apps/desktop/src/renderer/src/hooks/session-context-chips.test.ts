import assert from "node:assert/strict"
import { test } from "node:test"
import {
  addSessionContextChip,
  formatContextChipsForSend,
  listSessionContextChips,
  removeSessionContextChip,
  takeSessionContextChips,
  toggleSessionContextChip
} from "./session-context-chips.ts"

function drainChips() {
  takeSessionContextChips()
  for (const chip of [...listSessionContextChips()]) {
    removeSessionContextChip(chip.id)
  }
}

test("add replaces same id and take clears enabled chips", () => {
  drainChips()
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

test("toggleSessionContextChip flips enabled state", () => {
  drainChips()
  addSessionContextChip({
    id: "c2",
    kind: "knowledge",
    label: "doc.md",
    snippet: "content"
  })
  assert.equal(listSessionContextChips()[0]?.enabled, true)
  toggleSessionContextChip("c2")
  assert.equal(listSessionContextChips()[0]?.enabled, false)
  toggleSessionContextChip("c2")
  assert.equal(listSessionContextChips()[0]?.enabled, true)
})

test("takeSessionContextChips leaves disabled chips queued", () => {
  drainChips()
  addSessionContextChip({
    id: "keep",
    kind: "knowledge",
    label: "keep.md",
    snippet: "stay",
    enabled: false
  })
  addSessionContextChip({
    id: "send",
    kind: "knowledge",
    label: "send.md",
    snippet: "go"
  })
  const taken = takeSessionContextChips()
  assert.equal(taken.length, 1)
  assert.equal(taken[0]?.id, "send")
  assert.equal(listSessionContextChips().length, 1)
  assert.equal(listSessionContextChips()[0]?.id, "keep")
})

test("formatContextChipsForSend skips empty snippets and disabled chips", () => {
  const text = formatContextChipsForSend([
    { id: "a", kind: "knowledge", label: "a.md", path: "a.md", snippet: "  pin  ", enabled: true },
    { id: "b", kind: "knowledge", label: "b.md", enabled: true },
    { id: "c", kind: "knowledge", label: "c.md", path: "c.md", snippet: "excluded", enabled: false }
  ])
  assert.equal(text, "> a.md\npin")
})
