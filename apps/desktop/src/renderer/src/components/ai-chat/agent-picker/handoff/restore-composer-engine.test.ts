import assert from "node:assert/strict"
import { test } from "node:test"
import { restoreComposerEngineSelection } from "./restore-composer-engine.ts"

test("取消后选中态回到 from", () => {
  let runtimeId = "cursor"
  restoreComposerEngineSelection("claude", (id) => {
    runtimeId = id
  })
  assert.equal(runtimeId, "claude")
})

test("from 为空则不动当前选中", () => {
  let runtimeId = "claude"
  restoreComposerEngineSelection(null, (id) => {
    runtimeId = id
  })
  assert.equal(runtimeId, "claude")
})
