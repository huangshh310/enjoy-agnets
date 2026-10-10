/**
 * 焦点上报：轻防抖、立即 flush、同值不重发。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  bindSessionFocusSender,
  reportSessionFocused,
  resetSessionFocusForTest,
  SESSION_FOCUS_DEBOUNCE_MS
} from "./session-focus.ts"

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

test("防抖后只发最后一次 sessionId", async () => {
  resetSessionFocusForTest()
  const sent: Array<string | null> = []
  bindSessionFocusSender((input) => {
    sent.push(input.sessionId)
  })
  reportSessionFocused("ses_a")
  reportSessionFocused("ses_b")
  assert.deepEqual(sent, [])
  await wait(SESSION_FOCUS_DEBOUNCE_MS + 20)
  assert.deepEqual(sent, ["ses_b"])
  reportSessionFocused("ses_b")
  await wait(SESSION_FOCUS_DEBOUNCE_MS + 20)
  assert.deepEqual(sent, ["ses_b"])
  resetSessionFocusForTest()
})

test("关闭 / unload 立刻发 null，blur 后 focus 再报当前会话", async () => {
  resetSessionFocusForTest()
  const sent: Array<string | null> = []
  bindSessionFocusSender((input) => {
    sent.push(input.sessionId)
  })
  reportSessionFocused("ses_a", { immediate: true })
  reportSessionFocused(null, { immediate: true })
  reportSessionFocused("ses_a", { immediate: true })
  assert.deepEqual(sent, ["ses_a", null, "ses_a"])
  resetSessionFocusForTest()
})

test("sender throw 不得冒泡", () => {
  resetSessionFocusForTest()
  bindSessionFocusSender(() => {
    throw new Error("session.setFocused not registered")
  })
  reportSessionFocused("ses_a", { immediate: true })
  resetSessionFocusForTest()
})
