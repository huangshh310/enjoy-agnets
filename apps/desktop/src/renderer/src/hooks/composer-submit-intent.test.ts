import assert from "node:assert/strict"
import { test } from "node:test"
import {
  composerActionSlot,
  resolveComposerIntent,
  steerFallbackWhenNoRun
} from "./composer-submit-intent.ts"

test("空闲一律发送；运行中 Enter 排队、Meta+Enter 纠偏", () => {
  assert.equal(resolveComposerIntent(false, "queue", true), "send")
  assert.equal(resolveComposerIntent(true, "send", false), "queue")
  assert.equal(resolveComposerIntent(true, "send", true), "steer")
  assert.equal(resolveComposerIntent(true, "steer", false), "steer")
})

test("无 ActiveRun 时：已 idle 立刻发送，仍 running 才改排队", () => {
  assert.equal(steerFallbackWhenNoRun(false), "send")
  assert.equal(steerFallbackWhenNoRun(true), "queue")
})

test("有草稿只出发送，空草稿运行中只出 Stop，二者不同时出现", () => {
  assert.equal(composerActionSlot(true, true), "send")
  assert.equal(composerActionSlot(true, false), "stop")
  assert.equal(composerActionSlot(false, true), "send")
  assert.equal(composerActionSlot(false, false), "none")
})
