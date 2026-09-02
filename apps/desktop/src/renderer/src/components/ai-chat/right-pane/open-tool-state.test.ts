import assert from "node:assert/strict"
import { test } from "node:test"
import { openToolState } from "./open-tool-state.ts"
import type { RightPaneTab } from "./right-pane.types.ts"

test("reuses an existing review tab", () => {
  const tabs: RightPaneTab[] = [{ id: "review-1", kind: "review" }]
  const next = openToolState(tabs, "review", undefined, "review-2")
  assert.equal(next.activeId, "review-1")
  assert.equal(next.tabs.length, 1)
})

test("writes url onto the existing browser tab", () => {
  const tabs: RightPaneTab[] = [{ id: "browser-1", kind: "browser" }]
  const next = openToolState(tabs, "browser", { url: "https://react.dev/" }, "browser-2")
  assert.equal(next.activeId, "browser-1")
  assert.equal(next.tabs[0]?.url, "https://react.dev/")
})

test("forceNew always appends", () => {
  const tabs: RightPaneTab[] = [{ id: "browser-1", kind: "browser" }]
  const next = openToolState(tabs, "browser", { forceNew: true, url: "https://react.dev/" }, "browser-2")
  assert.equal(next.activeId, "browser-2")
  assert.equal(next.tabs.length, 2)
  assert.equal(next.tabs[1]?.url, "https://react.dev/")
})

test("opens context inspector tab", () => {
  const tabs: RightPaneTab[] = []
  const next = openToolState(tabs, "context", undefined, "context-1")
  assert.equal(next.activeId, "context-1")
  assert.equal(next.tabs[0]?.kind, "context")
})
