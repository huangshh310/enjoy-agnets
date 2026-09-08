import assert from "node:assert/strict"
import { test } from "node:test"
import { classifyThreadError } from "./classify-thread-error.ts"

test("402 / spend / credit 走 L4，不并进泛化限流", () => {
  assert.equal(classifyThreadError("402 Payment Required"), "credit")
  assert.equal(classifyThreadError("You've hit your spend limit"), "credit")
  assert.equal(classifyThreadError("insufficient credits on this plan"), "credit")
  assert.equal(classifyThreadError("quota exceeded for included usage"), "credit")
})

test("429 才是速率限制", () => {
  assert.equal(classifyThreadError("429 Too Many Requests"), "rate_limit")
  assert.equal(classifyThreadError("rate limit exceeded, retry later"), "rate_limit")
})

test("普通供应商错误保持 generic", () => {
  assert.equal(classifyThreadError("model not found"), "generic")
  assert.equal(classifyThreadError("No output generated"), "generic")
})
