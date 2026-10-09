import assert from "node:assert/strict"
import { test } from "node:test"
import { createOrphanRestoreScheduler } from "./restore-after-load.ts"

function fakeWindow(id: string) {
  const finish: Array<() => void> = []
  const fail: Array<() => void> = []
  return {
    id,
    webContents: {
      once: (event: "did-finish-load" | "did-fail-load", listener: () => void) => {
        if (event === "did-finish-load") finish.push(listener)
        else fail.push(listener)
      }
    },
    emitFinish() {
      for (const listener of finish) listener()
    },
    emitFail() {
      for (const listener of fail) listener()
    }
  }
}

test("窗口没 ready 不 restore；ready 只一次；重建后再 ready 也不再 restore", () => {
  const scheduler = createOrphanRestoreScheduler()
  const restored: string[] = []
  const first = fakeWindow("first")
  scheduler.schedule(first, (window) => {
    restored.push(window.id)
  })
  assert.deepEqual(restored, [])
  first.emitFinish()
  assert.deepEqual(restored, ["first"])
  first.emitFinish()
  assert.deepEqual(restored, ["first"])
  const second = fakeWindow("second")
  scheduler.schedule(second, (window) => {
    restored.push(window.id)
  })
  second.emitFinish()
  assert.deepEqual(restored, ["first"])
})

test("第一个窗口加载失败后，重建的窗口加载完会恢复一次", () => {
  const scheduler = createOrphanRestoreScheduler()
  const restored: string[] = []
  const restore = (window: { id: string }) => {
    restored.push(window.id)
  }
  const first = fakeWindow("first")
  scheduler.schedule(first, restore)
  first.emitFail()
  assert.deepEqual(restored, [])
  const rebuilt = fakeWindow("rebuilt")
  scheduler.schedule(rebuilt, restore)
  rebuilt.emitFinish()
  assert.deepEqual(restored, ["rebuilt"])
  rebuilt.emitFinish()
  assert.deepEqual(restored, ["rebuilt"])
})
