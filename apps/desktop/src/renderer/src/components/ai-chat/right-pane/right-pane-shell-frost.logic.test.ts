import assert from "node:assert/strict"
import { test } from "node:test"
import { shouldRightPaneShellFrost } from "./right-pane-shell-frost.logic"

test("右栏任何状态都不挂装饰：空态、审查、其它工具", () => {
  assert.equal(shouldRightPaneShellFrost({ emptyPicker: true, reviewActive: false }), false)
  assert.equal(shouldRightPaneShellFrost({ emptyPicker: false, reviewActive: true }), false)
  assert.equal(shouldRightPaneShellFrost({ emptyPicker: false, reviewActive: false }), false)
  assert.equal(shouldRightPaneShellFrost(), false)
})
