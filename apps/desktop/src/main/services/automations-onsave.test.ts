import assert from "node:assert/strict"
import { test } from "node:test"
import { cancelOnSaveFire, scheduleOnSaveFire } from "./automations-onsave.ts"

test("连续保存只开一轮", async () => {
  let count = 0
  scheduleOnSaveFire(() => {
    count += 1
  }, 20, "debounce-a")
  scheduleOnSaveFire(() => {
    count += 1
  }, 20, "debounce-a")
  await new Promise((resolve) => setTimeout(resolve, 50))
  assert.equal(count, 1)
})

test("退出时取消未触发的保存后", async () => {
  let count = 0
  scheduleOnSaveFire(() => {
    count += 1
  }, 40, "debounce-b")
  cancelOnSaveFire("debounce-b")
  await new Promise((resolve) => setTimeout(resolve, 60))
  assert.equal(count, 0)
})
