/**
 * agent.run 开跑前失败的稳定码：renderer 用 agentRunBlockedCode 走 failComposerSend，不露英文原文。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  agentRunBlockedCode,
  NEED_MODEL_CODE,
  NO_CHAT_ROUTE,
  requireAgentRunId,
  SESSION_NOT_READY_CODE
} from "./chat-readiness.ts"

test("三种发送闸码都能被 agentRunBlockedCode 认出", () => {
  for (const code of [NO_CHAT_ROUTE, NEED_MODEL_CODE, SESSION_NOT_READY_CODE]) {
    assert.equal(agentRunBlockedCode({ ok: false, code }), code)
  }
})

test("码与 renderer classify-thread-error 同串", () => {
  assert.equal(NEED_MODEL_CODE, "NEED_MODEL")
  assert.equal(SESSION_NOT_READY_CODE, "SESSION_NOT_READY")
})

test("未知码不当闸码，成功结果不当被拦", () => {
  assert.equal(agentRunBlockedCode({ ok: false, code: "Unknown session for this workspace." }), null)
  assert.equal(agentRunBlockedCode({ ok: true, runId: "run_1" }), null)
})

test("requireAgentRunId 遇闸码抛稳定码，不抛英文", () => {
  assert.throws(() => requireAgentRunId({ ok: false, code: SESSION_NOT_READY_CODE }), /^Error: SESSION_NOT_READY$/)
  assert.equal(requireAgentRunId({ ok: true, runId: "run_1" }), "run_1")
})
