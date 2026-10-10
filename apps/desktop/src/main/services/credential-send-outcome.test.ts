import assert from "node:assert/strict"
import { test } from "node:test"
import { httpStatusOf, structuredErrorTypeOf } from "./credential-send-outcome.ts"

test("结构化状态拆 RetryError.lastError 与 cause", () => {
  const inner = Object.assign(new Error("401"), { status: 401, type: "authentication_error" })
  const retry = Object.assign(new Error("RetryError"), { lastError: inner })
  assert.equal(httpStatusOf(retry), 401)
  assert.equal(structuredErrorTypeOf(retry), "authentication_error")
  const wrapped = Object.assign(new Error("wrapped"), { cause: Object.assign(new Error("402"), { status: 402 }) })
  assert.equal(httpStatusOf(wrapped), 402)
})
