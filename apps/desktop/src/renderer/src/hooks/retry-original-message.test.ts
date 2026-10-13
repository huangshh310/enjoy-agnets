/**
 * luna（#147 后续）：重试失败轮不能走续跑 Todo 的合成提示（内部英文提示会漏进聊天），要重发用户原话。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { TODO_CONTINUE_PROMPT } from "@enjoy-agents/ipc-contract"
import { shouldRetryAsTodoContinue } from "../components/ai-chat/composer/todo-continue-message.ts"

test("失败 / 空助手轮前面是用户真话 → 不走续跑（重发原话）", () => {
  assert.equal(shouldRetryAsTodoContinue({ content: "帮我写个排序函数" }), false)
  assert.equal(shouldRetryAsTodoContinue({ content: "" }), false)
  assert.equal(shouldRetryAsTodoContinue(undefined), false)
})

test("本轮用户句本身就是续跑句 → 仍走续跑", () => {
  assert.equal(shouldRetryAsTodoContinue({ content: TODO_CONTINUE_PROMPT }), true)
})

test("regenerateAssistantTurn 不再因「助手轮为空」就走 continueTodoTurn", () => {
  const src = readFileSync(new URL("./regenerate-turn.ts", import.meta.url), "utf8")
  assert.doesNotMatch(src, /isEmptyAssistantTurn\(target\)/)
  assert.match(src, /shouldRetryAsTodoContinue\(userMessage\)/)
})
