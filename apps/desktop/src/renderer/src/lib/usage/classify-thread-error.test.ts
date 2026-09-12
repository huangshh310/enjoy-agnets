import assert from "node:assert/strict"
import { test } from "node:test"
import {
  classifyThreadError,
  NEED_CLI_AUTHORIZING,
  NEED_CLI_INSPECTING,
  NEED_CLI_LOGIN,
  NEED_CLI_LOGIN_FAILED,
  NEED_CLI_OUTDATED,
  NEED_PROVIDER_KEY
} from "./classify-thread-error.ts"

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

test("ACP 未登录不是可重试供应商错误", () => {
  assert.equal(classifyThreadError(NEED_CLI_LOGIN), "auth")
  assert.equal(
    classifyThreadError("ACP_AUTH_REQUIRED: this CLI needs login before a session can start."),
    "auth"
  )
  assert.equal(classifyThreadError(NEED_PROVIDER_KEY), "needs_key")
  assert.equal(
    classifyThreadError("Add a provider API key in Settings → Providers before using this bound profile."),
    "needs_key"
  )
  assert.equal(classifyThreadError(NEED_CLI_INSPECTING), "inspecting")
  assert.equal(classifyThreadError(NEED_CLI_AUTHORIZING), "authorizing")
  assert.equal(classifyThreadError(NEED_CLI_LOGIN_FAILED), "login_failed")
  assert.equal(classifyThreadError(NEED_CLI_OUTDATED), "outdated")
})
