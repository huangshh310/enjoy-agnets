import assert from "node:assert/strict"
import { test } from "node:test"
import {
  acquireSingleInstanceLock,
  focusOrRestoreWindow,
  type FocusableWindow
} from "./single-instance.ts"

function fakeApp(gotLock: boolean) {
  const listeners: Array<() => void> = []
  return {
    requestSingleInstanceLock: () => gotLock,
    on: (_event: "second-instance", listener: () => void) => {
      listeners.push(listener)
    },
    listeners
  }
}

test("拿不到锁时不挂 second-instance，调用方不得启动调度", () => {
  const app = fakeApp(false)
  assert.equal(acquireSingleInstanceLock(app, () => undefined), false)
  assert.equal(app.listeners.length, 0)
})

test("拿到锁后 second-instance 聚焦已有窗", () => {
  const app = fakeApp(true)
  let focused = false
  assert.equal(
    acquireSingleInstanceLock(app, () => {
      focused = true
    }),
    true
  )
  assert.equal(app.listeners.length, 1)
  app.listeners[0]?.()
  assert.equal(focused, true)
})

test("最小化窗 restore + show + focus；无窗则重建", () => {
  const calls: string[] = []
  const minimized: FocusableWindow = {
    isDestroyed: () => false,
    isMinimized: () => true,
    restore: () => calls.push("restore"),
    show: () => calls.push("show"),
    focus: () => calls.push("focus")
  }
  focusOrRestoreWindow(() => [minimized])
  assert.deepEqual(calls, ["restore", "show", "focus"])

  let created = 0
  focusOrRestoreWindow(
    () => [{ ...minimized, isDestroyed: () => true }],
    () => {
      created += 1
    }
  )
  assert.equal(created, 1)
})
