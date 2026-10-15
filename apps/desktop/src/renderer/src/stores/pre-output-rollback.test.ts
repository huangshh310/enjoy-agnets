/**
 * 出字前回滚：Zod 把缺省 preOutput 打成 false 时，闸码且未出字仍要撕泡。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  assistantHasOutput,
  isImmediatePreOutputError,
  lastTurnHasNoOutput,
  rollbackPreOutputTurn,
  shouldRollbackPreOutput
} from "./pre-output-rollback.ts"
import type { ThreadMessage } from "./chat-store"

const pending: ThreadMessage[] = [
  { id: "msg_user_1", role: "user", content: "hello", createdAt: 1 },
  { id: "msg_1", role: "assistant", content: "", createdAt: 2, streaming: true }
]

test("空助手算尚未出字", () => {
  assert.equal(lastTurnHasNoOutput(pending), true)
  assert.equal(
    lastTurnHasNoOutput([
      pending[0]!,
      { ...pending[1]!, content: "partial" }
    ]),
    false
  )
})

test("preOutput true 必回滚", () => {
  assert.equal(shouldRollbackPreOutput({ preOutput: true, code: "provider_unreachable" }, pending), true)
})

test("preOutput false 且未出字：闸码仍回滚", () => {
  assert.equal(
    shouldRollbackPreOutput({ preOutput: false, code: "credential_invalid" }, pending),
    true
  )
  const rolled = rollbackPreOutputTurn(pending)
  assert.equal(rolled.composer, "hello")
  assert.equal(rolled.messages.length, 0)
})

test("开泵前 cite 不算出字，闸码仍回滚", () => {
  const cited: ThreadMessage[] = [
    { id: "msg_user_1", role: "user", content: "hello", createdAt: 1 },
    {
      id: "msg_1",
      role: "assistant",
      content: "",
      createdAt: 2,
      streaming: true,
      sources: [{ sourceId: "s1", title: "README.md", path: "README.md" }]
    }
  ]
  assert.equal(assistantHasOutput(cited[1]), false)
  assert.equal(lastTurnHasNoOutput(cited), true)
  assert.equal(
    shouldRollbackPreOutput({ preOutput: false, code: "provider_unreachable" }, cited),
    true
  )
  const forced = rollbackPreOutputTurn(cited, { dropAssistant: true })
  assert.equal(forced.composer, "hello")
  assert.equal(forced.messages.length, 0)
})

test("闸码 run.error 未认领 runId 时立刻折，不进缓冲", () => {
  assert.equal(
    isImmediatePreOutputError({
      type: "run.error",
      code: "credential_invalid",
      preOutput: false
    }),
    true
  )
  assert.equal(isImmediatePreOutputError({ type: "run.start" }), false)
  assert.equal(isImmediatePreOutputError({ type: "run.error", code: "timeout" }), false)
})

test("已经出字后 preOutput false 不回滚", () => {
  const produced: ThreadMessage[] = [
    pending[0]!,
    { ...pending[1]!, content: "hi" }
  ]
  assert.equal(
    shouldRollbackPreOutput({ preOutput: false, code: "provider_unreachable" }, produced),
    false
  )
})

test("leo soft（#136）：isEmptyStreamingAssistant 的 sources 条件——只有 cite 的流式助手轮不算空壳（Stop 不丢）", async () => {
  const { isEmptyStreamingAssistant } = await import("../hooks/composer-run-policy.ts")
  const src = [{ sourceId: "s1", title: "README.md", path: "README.md" }]
  const shell: ThreadMessage = { id: "a", role: "assistant", content: "", createdAt: 2, streaming: true }
  assert.equal(isEmptyStreamingAssistant(shell), true)
  assert.equal(isEmptyStreamingAssistant({ ...shell, sources: src }), false)
  assert.equal(isEmptyStreamingAssistant({ ...shell, sources: [] }), true)
})

test("leo MUST 2（#136）：preOutput:true + 非闸码 + 本轮未出字 → 仍回滚（只认 main 的 preOutput）", () => {
  const pending: ThreadMessage[] = [
    { id: "u", role: "user", content: "hello", createdAt: 1 },
    { id: "a", role: "assistant", content: "", createdAt: 2, streaming: true }
  ]
  assert.equal(shouldRollbackPreOutput({ preOutput: true, code: "some_runtime_error" }, pending), true)
  assert.equal(shouldRollbackPreOutput({ preOutput: true, code: null }, pending), true)
  // 对照：同样非闸码但 main 没说 preOutput → 不回滚
  assert.equal(shouldRollbackPreOutput({ preOutput: false, code: "some_runtime_error" }, pending), false)
})
