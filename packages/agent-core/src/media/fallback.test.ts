import assert from "node:assert/strict"
import { test } from "node:test"
import { withMediaFallback } from "./fallback.ts"

test("主路径成功不走备用", async () => {
  const result = await withMediaFallback(
    async () => "ok",
    async () => "alt"
  )
  assert.deepEqual(result, { value: "ok", usedFallback: false })
})

test("主路径失败后走备用", async () => {
  const result = await withMediaFallback(
    async () => {
      throw new Error("primary")
    },
    async () => "alt"
  )
  assert.deepEqual(result, { value: "alt", usedFallback: true })
})

test("两条都失败抛主路径错误", async () => {
  await assert.rejects(
    () =>
      withMediaFallback(
        async () => {
          throw new Error("primary")
        },
        async () => {
          throw new Error("secondary")
        }
      ),
    /primary/
  )
})
