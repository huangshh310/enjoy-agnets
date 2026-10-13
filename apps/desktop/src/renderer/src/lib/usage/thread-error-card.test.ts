import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { threadErrorCardVisible } from "./thread-error-card.ts"
import { PREVIOUS_STILL_PREPARING } from "./classify-thread-error.ts"
import { MODEL_NEEDS_VISION } from "@enjoy-agents/ipc-contract/run-error-codes"

test("灰条「上一条还在准备」不算红卡；空也不算", () => {
  assert.equal(threadErrorCardVisible(PREVIOUS_STILL_PREPARING), false)
  assert.equal(threadErrorCardVisible(null), false)
  assert.equal(threadErrorCardVisible(""), false)
})
test("真失败与 needs_vision 算红卡", () => {
  assert.equal(threadErrorCardVisible("boom"), true)
  assert.equal(threadErrorCardVisible(MODEL_NEEDS_VISION), true)
})
test("横幅与需处理条共用同一判断", () => {
  const banner = readFileSync(new URL("../../components/ai-chat/thread/thread-error-banner.tsx", import.meta.url), "utf8")
  const strip = readFileSync(new URL("../../components/ai-chat/attention/attention-strip.tsx", import.meta.url), "utf8")
  assert.match(banner, /threadErrorCardVisible\(error\)/)
  assert.match(strip, /threadErrorCardVisible\(state\.error\)/)
  assert.doesNotMatch(strip, /Boolean\(state\.error\)/)
})
test("needs_vision 分支：横幅用看图提示文案，不走通用 humanize", () => {
  const banner = readFileSync(new URL("../../components/ai-chat/thread/thread-error-banner.tsx", import.meta.url), "utf8")
  assert.match(banner, /kind === "needs_vision"\s*\?\s*t\("chat\.needsVisionHint"\)/)
})
