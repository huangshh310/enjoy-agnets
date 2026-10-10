/**
 * 出字前回滚：Zod 把缺省 preOutput 打成 false 时，闸码且未出字仍要撕泡。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
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
