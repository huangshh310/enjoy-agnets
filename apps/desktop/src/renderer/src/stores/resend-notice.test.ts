/**
 * 连不上白卡「再发一次」：结果回来前不收卡。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { providerUnreachableCode } from "../lib/send-gate-codes.ts"
import { errorAfterOptimisticSend, errorAfterStreamEvent, holdEmptyForResend } from "./resend-notice.ts"
import type { ThreadMessage } from "./chat-store.types.ts"

const UNREACHABLE = providerUnreachableCode()
const start = { type: "run.start", runId: "run_1" } as unknown as StreamEvent
const delta = { type: "text.delta", runId: "run_1", text: "hi" } as unknown as StreamEvent
const source = { type: "source.added", runId: "run_1" } as unknown as StreamEvent
const end = { type: "run.end", runId: "run_1" } as unknown as StreamEvent

test("乐观气泡入列不清连不上的卡，其它错照旧清", () => {
  assert.equal(errorAfterOptimisticSend(UNREACHABLE), UNREACHABLE)
  assert.equal(errorAfterOptimisticSend("credential_invalid"), null)
  assert.equal(errorAfterOptimisticSend(null), null)
})

test("run.start 不收连不上的卡", () => {
  assert.equal(errorAfterStreamEvent(UNREACHABLE, start, null), undefined)
  assert.equal(errorAfterStreamEvent("boom", start, null), null)
})

test("出字或 run.end 才收卡；cite 不算出字", () => {
  assert.equal(errorAfterStreamEvent(UNREACHABLE, delta, undefined), null)
  assert.equal(errorAfterStreamEvent(UNREACHABLE, source, undefined), undefined)
  assert.equal(errorAfterStreamEvent(UNREACHABLE, end, null), null)
})

test("再失败写回失败码", () => {
  const err = { type: "run.error", runId: "run_1", message: UNREACHABLE } as unknown as StreamEvent
  assert.equal(errorAfterStreamEvent(UNREACHABLE, err, UNREACHABLE), UNREACHABLE)
})

test("空会话再发：只有乐观一轮且没出字时停在开始面", () => {
  const optimistic: ThreadMessage[] = [
    { id: "u", role: "user", content: "hello", createdAt: 1 },
    { id: "a", role: "assistant", content: "", createdAt: 2, streaming: true }
  ]
  assert.equal(holdEmptyForResend([], true, UNREACHABLE), true)
  assert.equal(holdEmptyForResend(optimistic, true, UNREACHABLE), true)
  assert.equal(holdEmptyForResend(optimistic, false, UNREACHABLE), false)
  assert.equal(holdEmptyForResend(optimistic, true, null), false)
  const wrote: ThreadMessage[] = [optimistic[0], { ...optimistic[1], content: "hi" }]
  assert.equal(holdEmptyForResend(wrote, true, UNREACHABLE), false)
  const history: ThreadMessage[] = [
    { id: "u0", role: "user", content: "old", createdAt: 0 },
    { id: "a0", role: "assistant", content: "ok", createdAt: 0 },
    ...optimistic
  ]
  assert.equal(holdEmptyForResend(history, true, UNREACHABLE), false)
})
