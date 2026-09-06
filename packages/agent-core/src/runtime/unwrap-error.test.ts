import assert from "node:assert/strict"
import { test } from "node:test"
import { unwrapErrorMessage } from "./unwrap-error.ts"

test("空流外壳改走 cause 或响应体", () => {
  assert.equal(
    unwrapErrorMessage({
      message: "No output generated. Check the stream for errors.",
      cause: { message: "模型 minimax-m3 不存在" }
    }),
    "模型 minimax-m3 不存在"
  )
  assert.equal(
    unwrapErrorMessage({
      message: "No output generated. Check the stream for errors.",
      responseBody: "{\"error\":\"invalid reasoning_effort\"}"
    }),
    "{\"error\":\"invalid reasoning_effort\"}"
  )
})

test("没有 cause 时给出可操作提示，而不是只回空流句", () => {
  const text = unwrapErrorMessage({
    message: "No output generated. Check the stream for errors."
  })
  assert.match(text, /model ID/i)
  assert.match(text, /reasoning/i)
})

test("普通错误保留原文", () => {
  assert.equal(unwrapErrorMessage(new Error("401 Unauthorized")), "401 Unauthorized")
})
