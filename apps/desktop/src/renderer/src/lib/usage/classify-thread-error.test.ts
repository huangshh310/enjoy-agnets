import assert from "node:assert/strict"
import { test } from "node:test"
import {
  classifyThreadError,
  humanizeThreadError,
  INTERNAL_STORE_ERROR,
  SEND_FAILED_RESTORE,
  SESSION_CREATE_TIMEOUT,
  SESSION_NOT_READY,
  NEED_CLI_AUTHORIZING,
  NEED_CLI_INSPECTING,
  NEED_CLI_LOGIN,
  NEED_CLI_LOGIN_FAILED,
  NEED_CLI_OUTDATED,
  NEED_MODEL,
  NEED_PROVIDER_KEY,
  NO_CHAT_ROUTE,
  ACP_RESUME_FALLBACK,
  NEED_REMOTE_CONNECTED,
  RESTORE_NO_MATCHING,
  RUN_FAILED,
  CATCH_UP_APPROVAL_TIMEOUT
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

test("机器码走人话，横幅不得摊原文", () => {
  const t = (path: string) => path
  assert.equal(classifyThreadError(RESTORE_NO_MATCHING), "restore_no_matching")
  assert.equal(classifyThreadError(RUN_FAILED), "run_failed")
  assert.equal(classifyThreadError(CATCH_UP_APPROVAL_TIMEOUT), "catch_up_timeout")
  assert.equal(humanizeThreadError(RESTORE_NO_MATCHING, t), "chat.restoreNoMatching")
  assert.equal(humanizeThreadError(RUN_FAILED, t), "chat.runFailed")
  assert.equal(humanizeThreadError(CATCH_UP_APPROVAL_TIMEOUT, t), "chat.catchUpApprovalTimeout")
  assert.equal(humanizeThreadError("mystery_machine_code", t), "chat.errorGenericHint")
  assert.notEqual(humanizeThreadError(RESTORE_NO_MATCHING, t), RESTORE_NO_MATCHING)
})

test("库约束原文不进 generic 详情", () => {
  assert.equal(classifyThreadError(INTERNAL_STORE_ERROR), "store")
  assert.equal(classifyThreadError("UNIQUE constraint failed: approvals.id"), "store")
})

test("创建窗发送失败走还文，不是 generic 详情", () => {
  assert.equal(classifyThreadError(SEND_FAILED_RESTORE), "send_restore")
  assert.equal(classifyThreadError(SESSION_CREATE_TIMEOUT), "send_restore")
  assert.equal(classifyThreadError(SESSION_NOT_READY), "send_restore")
})

test("ACP 未登录不是可重试供应商错误", () => {
  assert.equal(classifyThreadError(NEED_CLI_LOGIN), "auth")
  assert.equal(
    classifyThreadError("ACP_AUTH_REQUIRED: this CLI needs login before a session can start."),
    "auth"
  )
  assert.equal(classifyThreadError(NO_CHAT_ROUTE), "no_chat_route")
  assert.equal(
    classifyThreadError("Error invoking remote method 'agent.run': Error: no_chat_route"),
    "no_chat_route"
  )
  assert.notEqual(classifyThreadError(NO_CHAT_ROUTE), "needs_key")
  assert.notEqual(classifyThreadError(NO_CHAT_ROUTE), "generic")
  assert.equal(classifyThreadError(NEED_MODEL), "needs_model")
  assert.equal(classifyThreadError("Choose a model in Settings → Providers before running an agent."), "needs_model")
  assert.equal(classifyThreadError(NEED_PROVIDER_KEY), "needs_key")
  assert.equal(
    classifyThreadError("Add a provider API key in Settings → Providers before using this bound profile."),
    "needs_key"
  )
  assert.equal(classifyThreadError(NEED_CLI_INSPECTING), "inspecting")
  assert.equal(classifyThreadError(NEED_CLI_AUTHORIZING), "authorizing")
  assert.equal(classifyThreadError(NEED_CLI_LOGIN_FAILED), "login_failed")
  assert.equal(classifyThreadError(NEED_CLI_OUTDATED), "outdated")
  assert.equal(classifyThreadError("远端未找到 dsh"), "remote_cli_missing")
  assert.equal(classifyThreadError("spawn remote binary not found"), "remote_cli_missing")
  assert.equal(classifyThreadError(NEED_REMOTE_CONNECTED), "remote_disconnected")
  assert.equal(classifyThreadError("REMOTE_DISCONNECTED: write refused"), "remote_disconnected")
  assert.equal(
    classifyThreadError(`${ACP_RESUME_FALLBACK}: Could not resume the CLI session; started a new one.`),
    "resume_fallback"
  )
})
