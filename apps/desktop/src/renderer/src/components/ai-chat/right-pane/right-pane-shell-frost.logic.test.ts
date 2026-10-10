import assert from "node:assert/strict"
import { test } from "node:test"
import { shouldRightPaneShellFrost } from "./right-pane-shell-frost.logic"

test("启动页不挂 shell 装饰", () => {
  assert.equal(shouldRightPaneShellFrost({ emptyPicker: true, reviewActive: false }), false)
})

test("审查空态：装饰关", () => {
  assert.equal(shouldRightPaneShellFrost({ emptyPicker: false, reviewActive: true }), false)
})

test("审查有文件：装饰仍关", () => {
  assert.equal(shouldRightPaneShellFrost({ emptyPicker: false, reviewActive: true }), false)
})

test("非审查且已打开其它工具：装饰开", () => {
  assert.equal(shouldRightPaneShellFrost({ emptyPicker: false, reviewActive: false }), true)
})
