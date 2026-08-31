import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveTimeoutMs, throwIfTimedOut, withTimeout } from "./timeout.ts"
import { withModelFallback } from "./fallback.ts"
import { RuntimeError } from "../runtime/errors.ts"

test("resolveTimeoutMs 把 0 当成不限", () => {
  assert.equal(resolveTimeoutMs(0, 8_000), undefined)
  assert.equal(resolveTimeoutMs(1_500, 8_000), 1_500)
  assert.equal(resolveTimeoutMs(undefined, 8_000), 8_000)
})

test("withTimeout 超时后 signal aborted", async () => {
  await assert.rejects(
    () =>
      withTimeout(async (signal) => {
        await new Promise((resolve) => setTimeout(resolve, 30))
        throwIfTimedOut(signal)
        return "ok"
      }, 5),
    RuntimeError
  )
})

test("fallback 跳过可重试错误并使用下一模型", async () => {
  const { modelId, result } = await withModelFallback(["bad", "good"], async (id) => {
    if (id === "bad") throw new Error("429 rate limit")
    return `used:${id}`
  })
  assert.equal(modelId, "good")
  assert.equal(result, "used:good")
})

test("fallback 认证失败立即停止", async () => {
  await assert.rejects(
    () =>
      withModelFallback(["a", "b"], async () => {
        throw new Error("401 unauthorized")
      }),
    (error: unknown) => error instanceof RuntimeError && error.errorClass === "auth"
  )
})
