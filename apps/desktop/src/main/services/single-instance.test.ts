import assert from "node:assert/strict"
import { test } from "node:test"
import {
  acquireSingleInstanceLock,
  exitSecondaryInstance,
  focusOrRestoreWindow,
  isPrimaryInstance,
  runIfPrimaryInstance,
  startPrimaryOrExit,
  type FocusableWindow
} from "./single-instance.ts"

function fakeApp(gotLock: boolean) {
  const listeners: Array<() => void> = []
  let exited: number | undefined
  return {
    requestSingleInstanceLock: () => gotLock,
    on: (_event: "second-instance", listener: () => void) => {
      listeners.push(listener)
    },
    exit: (code?: number) => {
      exited = code ?? 0
    },
    listeners,
    get exited() {
      return exited
    }
  }
}

test("抢锁失败时 exit，不调用 getDatabase / stampAutomationAlive，不启动调度", () => {
  const app = fakeApp(false)
  let getDatabase = 0
  let stampAutomationAlive = 0
  let started = 0
  const ok = startPrimaryOrExit(
    app,
    () => undefined,
    () => {
      started += 1
      getDatabase += 1
      stampAutomationAlive += 1
    }
  )
  assert.equal(ok, false)
  assert.equal(isPrimaryInstance(), false)
  assert.equal(app.exited, 0)
  assert.equal(started, 0)
  runIfPrimaryInstance(() => {
    getDatabase += 1
    stampAutomationAlive += 1
  })
  assert.equal(getDatabase, 0)
  assert.equal(stampAutomationAlive, 0)
})

test("拿不到锁时不挂 second-instance", () => {
  const app = fakeApp(false)
  assert.equal(acquireSingleInstanceLock(app, () => undefined), false)
  assert.equal(app.listeners.length, 0)
  exitSecondaryInstance(app)
  assert.equal(app.exited, 0)
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
  assert.equal(isPrimaryInstance(), true)
  assert.equal(app.listeners.length, 1)
  app.listeners[0]?.()
  assert.equal(focused, true)
})

test("最小化窗 restore + show + focus；未 ready 不新建窗", () => {
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
    },
    () => false
  )
  assert.equal(created, 0)
  focusOrRestoreWindow(
    () => [{ ...minimized, isDestroyed: () => true }],
    () => {
      created += 1
    },
    () => true
  )
  assert.equal(created, 1)
})
