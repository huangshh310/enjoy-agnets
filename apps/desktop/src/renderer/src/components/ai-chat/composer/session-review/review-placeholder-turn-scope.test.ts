/**
 * E1 D5：验收条占位句 / 技能 chip 只看最后一条用户消息之后这一轮，不越过用户句回溯；
 * 用户停掉时 seal 的工具（user_aborted）算中断 → 「可能改了文件，请核对」，不说「这一轮改了文件」。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { TODO_CONTINUE_PROMPT } from "@enjoy-agents/ipc-contract"
import { sealAbandonedTools } from "@enjoy-agents/ipc-contract"
import { reviewPlaceholderKind } from "./review-placeholder-kind.ts"
import {
  lastAssistantSinceUser,
  toolsAfterLastUser
} from "../../right-pane/views/review/last-turn-paths.ts"
import { lastAssistantTurn } from "../../run-ledger/collect-run-ledger.ts"
import type { ThreadMessage } from "../../../../stores/chat-store.types.ts"

function msg(partial: Partial<ThreadMessage> & Pick<ThreadMessage, "role" | "content">): ThreadMessage {
  return { id: partial.id ?? "m", createdAt: 1, ...partial }
}

const stoppedWrite = sealAbandonedTools(
  [{ id: "w1", name: "write_file", args: { path: "e2e-stub.txt" }, state: "input-available" }],
  { aborted: true }
)!

test("D5 复现：停掉的写盘轮之后发新一句（无工具）→ 不回溯上一轮，不说「这一轮改了文件」", () => {
  const messages = [
    msg({ id: "u1", role: "user", content: "please write slow note" }),
    msg({ id: "a1", role: "assistant", content: "", tools: stoppedWrite }),
    msg({ id: "u2", role: "user", content: "新的一句" }),
    msg({ id: "a2", role: "assistant", content: "好的" })
  ]
  assert.deepEqual(toolsAfterLastUser(messages), [])
  assert.notEqual(reviewPlaceholderKind(toolsAfterLastUser(messages)), "files")
  // 旧口径（lastAssistantTurn）会越过 u2 认回 a1：这正是 D5 的根因。
  assert.equal(lastAssistantTurn(messages)?.id, "a1")
  assert.equal(lastAssistantSinceUser(messages)?.id, "a2")
})

test("用户停掉的写工具（user_aborted seal）算中断 → maybe，不是 files", () => {
  assert.equal(stoppedWrite[0]?.state, "output-error")
  assert.equal(reviewPlaceholderKind(stoppedWrite), "maybe")
  // 只读工具被停：不说「可能改了文件」。
  const stoppedRead = sealAbandonedTools(
    [{ id: "r1", name: "read_file", args: { path: "a.ts" }, state: "input-available" }],
    { aborted: true }
  )!
  assert.equal(reviewPlaceholderKind(stoppedRead), "unknown")
})

test("没停过的正常轮次：占位句与技能 chip 取的那条助手消息不变", () => {
  const skillTurn = msg({
    id: "a2",
    role: "assistant",
    content: "",
    tools: [{ id: "w2", name: "write_file", args: { path: "b.ts" }, state: "output-available" }]
  })
  const messages = [
    msg({ id: "u1", role: "user", content: "先改 a" }),
    msg({ id: "a1", role: "assistant", content: "", tools: [{ id: "w1", name: "write_file", args: { path: "a.ts" }, state: "output-available" }] }),
    msg({ id: "u2", role: "user", content: "再改 b" }),
    skillTurn,
    msg({ id: "a3", role: "assistant", content: "改好了" })
  ]
  assert.equal(lastAssistantSinceUser(messages)?.id, lastAssistantTurn(messages)?.id)
  assert.equal(reviewPlaceholderKind(toolsAfterLastUser(messages)), "files")
  assert.equal(reviewPlaceholderKind(lastAssistantTurn(messages)?.tools ?? []), "files")
})

test("续跑用户句不切断本轮：工具与助手消息仍按上一条真实用户句起算", () => {
  const messages = [
    msg({ id: "u1", role: "user", content: "做完" }),
    msg({ id: "a1", role: "assistant", content: "", tools: [{ id: "w1", name: "write_file", args: { path: "a.ts" }, state: "output-available" }] }),
    msg({ id: "u2", role: "user", content: TODO_CONTINUE_PROMPT }),
    msg({ id: "a2", role: "assistant", content: "继续" })
  ]
  assert.equal(toolsAfterLastUser(messages).length, 1)
  assert.equal(lastAssistantSinceUser(messages)?.id, "a1")
})

test("接线：占位句吃 toolsAfterLastUser，技能 chip 吃 lastAssistantSinceUser，不再用 lastAssistantTurn", () => {
  const src = readFileSync(new URL("./composer-session-review.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n")
  assert.match(src, /reviewPlaceholderKind\(toolsAfterLastUser\(messages\)/)
  assert.match(src, /chipsFromLastAssistant\(lastAssistantSinceUser\(messages\)/)
  assert.doesNotMatch(src, /lastAssistantTurn/)
})
