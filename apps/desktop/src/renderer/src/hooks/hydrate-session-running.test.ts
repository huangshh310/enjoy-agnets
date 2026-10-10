/**
 * 切到后台仍在跑的会话：只按该会话自己的 running 封口。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { hydrateSessionRunning } from "./hydrate-session-running.ts"

test("该会话自己在跑：不封口", () => {
  assert.equal(hydrateSessionRunning({ sessionOwnRunning: true }), true)
})

test("该会话自己没在跑才封口，不看前台 running", () => {
  assert.equal(hydrateSessionRunning({ sessionOwnRunning: false }), false)
})
