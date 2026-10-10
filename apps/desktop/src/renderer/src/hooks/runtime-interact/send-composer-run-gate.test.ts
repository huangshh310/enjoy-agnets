/**
 * 发送闸结构化回执：挡住必须还草稿，禁止空按。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { NO_CHAT_ROUTE } from "@enjoy-agents/ipc-contract/chat-readiness"
import { applyComposerRunGate } from "./send-composer-run-gate.ts"

test("agent.run {ok:false, code:no_chat_route} 回草稿，不当成功", () => {
  const gated = applyComposerRunGate({ ok: false, code: NO_CHAT_ROUTE }, "还没发出的话", "")
  assert.deepEqual(gated, {
    ok: false,
    code: "no_chat_route",
    composer: "还没发出的话"
  })
})

test("挡住时已键入的字与草稿合并，不丢任一边", () => {
  const gated = applyComposerRunGate({ ok: false, code: NO_CHAT_ROUTE }, "原稿", "后又打了一句")
  assert.equal(gated.ok, false)
  if (gated.ok) return
  assert.equal(gated.code, "no_chat_route")
  assert.match(gated.composer, /原稿/)
  assert.match(gated.composer, /后又打了一句/)
})

test("成功只回 runId", () => {
  assert.deepEqual(applyComposerRunGate({ ok: true, runId: "run_1" }, "hi", ""), {
    ok: true,
    runId: "run_1"
  })
})
