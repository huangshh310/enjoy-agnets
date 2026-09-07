import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveActionChipIntent } from "./action-chip-intent.ts"

test("空闲点击一律新开一轮，不看 actionType", () => {
  assert.equal(resolveActionChipIntent(false, "queue"), "send")
  assert.equal(resolveActionChipIntent(false, "fill_input"), "send")
})

test("运行中按 actionType 分流：入队或只回填", () => {
  assert.equal(resolveActionChipIntent(true, "queue"), "queue")
  assert.equal(resolveActionChipIntent(true, "fill_input"), "fill_input")
})
