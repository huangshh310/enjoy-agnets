import assert from "node:assert/strict"
import { test } from "node:test"
import {
  applyAutomationDrawerCloseFocus,
  clearAutomationRowPointerMark,
  markAutomationRowPointer
} from "./automation-row-focus"

test("指针打开后回焦打 pointer-return", () => {
  const el = {
    dataset: {} as Record<string, string>,
    focused: false,
    focus() {
      this.focused = true
    }
  }
  markAutomationRowPointer(el as unknown as HTMLButtonElement)
  assert.equal(el.dataset.pointerReturn, "")
  applyAutomationDrawerCloseFocus()
  assert.equal(el.focused, true)
  assert.equal(el.dataset.pointerReturn, "")
  clearAutomationRowPointerMark()
})
