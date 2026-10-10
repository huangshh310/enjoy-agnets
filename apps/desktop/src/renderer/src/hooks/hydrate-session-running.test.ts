/**
 * 切到后台仍在跑的会话：按该会话 park.running 封口，不按前台 running。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { hydrateSessionRunning } from "./hydrate-session-running.ts"

test("前台空闲但目标会话后台在跑：不按前台 running 封口", () => {
  assert.equal(
    hydrateSessionRunning({
      sessionId: "ses_bg",
      storeSessionId: "ses_fg",
      storeRunning: false,
      parkedRunning: true
    }),
    true
  )
})

test("该会话自己没在跑才封口", () => {
  assert.equal(
    hydrateSessionRunning({
      sessionId: "ses_idle",
      storeSessionId: "ses_idle",
      storeRunning: false,
      parkedRunning: false
    }),
    false
  )
})
