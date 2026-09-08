/**
 * toast 只分 updated / missed，不带错误原文。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { showSkillSourceToast, subscribeSkillSourceToast } from "./skill-source-toast.ts"

test("showSkillSourceToast 只广播 kind 与 count", () => {
  let seen: { kind: string; count: number } | null = null
  const stop = subscribeSkillSourceToast((toast) => {
    if (toast) seen = { kind: toast.kind, count: toast.count }
  })
  showSkillSourceToast("updated", 3)
  assert.deepEqual(seen, { kind: "updated", count: 3 })
  stop()
})
