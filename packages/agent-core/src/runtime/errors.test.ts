import assert from "node:assert/strict"
import { test } from "node:test"
import { classifyError } from "./errors.ts"

test("402 / spend 走 credit_limit，不并进 rate_limit", () => {
  assert.equal(classifyError(new Error("402 Payment Required")).errorClass, "credit_limit")
  assert.equal(classifyError(new Error("You've hit your spend limit")).errorClass, "credit_limit")
  assert.equal(classifyError(new Error("insufficient credits")).retryable, false)
})

test("429 rate limit 仍可重试", () => {
  const err = classifyError(new Error("429 rate limit"))
  assert.equal(err.errorClass, "rate_limit")
  assert.equal(err.retryable, true)
})
