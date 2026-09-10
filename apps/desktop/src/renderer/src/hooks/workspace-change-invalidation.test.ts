/**
 * 只刷新当前工作区；防抖会合并连续 schedule。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { createChangeInvalidator, shouldInvalidateChange } from "./workspace-change-invalidation.ts"

test("只认当前工作区的 onChanged", () => {
  assert.equal(shouldInvalidateChange({ workspaceId: "ws-a", path: "a.ts" }, "ws-a"), true)
  assert.equal(shouldInvalidateChange({ workspaceId: "ws-b", path: "a.ts" }, "ws-a"), false)
  assert.equal(shouldInvalidateChange({ workspaceId: "ws-a", path: "a.ts" }, null), false)
})

test("连续 schedule 只 invalidate 一次", async () => {
  let count = 0
  const invalidator = createChangeInvalidator({
    debounceMs: 20,
    invalidate: () => {
      count += 1
    }
  })
  invalidator.schedule()
  invalidator.schedule()
  invalidator.schedule()
  await new Promise((resolve) => setTimeout(resolve, 50))
  assert.equal(count, 1)
  invalidator.cancel()
})

test("cancel 会丢掉未触发的 invalidate", async () => {
  let count = 0
  const invalidator = createChangeInvalidator({
    debounceMs: 30,
    invalidate: () => {
      count += 1
    }
  })
  invalidator.schedule()
  invalidator.cancel()
  await new Promise((resolve) => setTimeout(resolve, 50))
  assert.equal(count, 0)
})
