import assert from "node:assert/strict"
import { test } from "node:test"
import { scheduleOrphanRestoreAfterLoad } from "./restore-after-load.ts"

function fakeContents() {
  const listeners: Array<() => void> = []
  return {
    once: (_event: "did-finish-load", listener: () => void) => {
      listeners.push(listener)
    },
    emit() {
      for (const listener of listeners) listener()
    }
  }
}

test("窗口没 ready 不 restore；ready 只一次；重建后再 ready 也不再 restore", () => {
  let restores = 0
  const restore = () => {
    restores += 1
  }
  const first = fakeContents()
  scheduleOrphanRestoreAfterLoad(first, restore)
  assert.equal(restores, 0)
  first.emit()
  assert.equal(restores, 1)
  first.emit()
  assert.equal(restores, 1)
  const second = fakeContents()
  scheduleOrphanRestoreAfterLoad(second, restore)
  second.emit()
  assert.equal(restores, 1)
})
