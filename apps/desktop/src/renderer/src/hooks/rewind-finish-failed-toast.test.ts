/**
 * luna n167 P2：「还没能放回输入框」延迟 toast。
 */
import assert from "node:assert/strict"
import { afterEach, mock, test } from "node:test"
import {
  cancelRewindFinishFailedToastOnRestored,
  clearRewindFinishFailedToast,
  REWIND_FINISH_FAILED_TOAST_DELAY_MS,
  rewindFinishFailedToastPendingForTest,
  scheduleRewindFinishFailedToast
} from "./rewind-finish-failed-toast.ts"

afterEach(() => {
  clearRewindFinishFailedToast()
  mock.timers.reset()
})

test("300ms 前不弹，到点才弹", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"], now: 0 })
  const shown: string[] = []
  scheduleRewindFinishFailedToast(() => shown.push("toast"))
  assert.equal(rewindFinishFailedToastPendingForTest(), true)
  t.mock.timers.tick(REWIND_FINISH_FAILED_TOAST_DELAY_MS - 1)
  assert.deepEqual(shown, [])
  t.mock.timers.tick(1)
  assert.deepEqual(shown, ["toast"])
  assert.equal(rewindFinishFailedToastPendingForTest(), false)
})

test("期间成功放回 → 不弹", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"], now: 0 })
  const shown: string[] = []
  scheduleRewindFinishFailedToast(() => shown.push("toast"))
  t.mock.timers.tick(100)
  cancelRewindFinishFailedToastOnRestored()
  t.mock.timers.tick(REWIND_FINISH_FAILED_TOAST_DELAY_MS)
  assert.deepEqual(shown, [])
})

test("切会话清 timer → 不弹", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"], now: 0 })
  const shown: string[] = []
  let session = "ses_a"
  const listeners = new Set<() => void>()
  scheduleRewindFinishFailedToast(() => shown.push("toast"), {
    getSessionId: () => session,
    subscribeSession: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  })
  session = "ses_b"
  for (const l of listeners) l()
  assert.equal(rewindFinishFailedToastPendingForTest(), false)
  t.mock.timers.tick(REWIND_FINISH_FAILED_TOAST_DELAY_MS)
  assert.deepEqual(shown, [])
})

test("卸载 clear → 不弹", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"], now: 0 })
  const shown: string[] = []
  scheduleRewindFinishFailedToast(() => shown.push("toast"))
  clearRewindFinishFailedToast()
  t.mock.timers.tick(REWIND_FINISH_FAILED_TOAST_DELAY_MS)
  assert.deepEqual(shown, [])
})
