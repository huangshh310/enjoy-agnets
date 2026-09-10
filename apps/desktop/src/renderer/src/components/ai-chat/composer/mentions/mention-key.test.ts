import assert from "node:assert/strict"
import { test } from "node:test"
import { mentionKeyAction } from "./mention-key.ts"

test("面板打开时方向键循环，Enter 选中", () => {
  assert.deepEqual(mentionKeyAction("ArrowDown", true, 0, 3), { type: "move", index: 1 })
  assert.deepEqual(mentionKeyAction("ArrowUp", true, 0, 3), { type: "move", index: 2 })
  assert.deepEqual(mentionKeyAction("Enter", true, 1, 3), { type: "pick", index: 1 })
  assert.deepEqual(mentionKeyAction("Escape", true, 0, 3), { type: "dismiss" })
  assert.deepEqual(mentionKeyAction("Enter", false, 0, 3), { type: "none" })
})
