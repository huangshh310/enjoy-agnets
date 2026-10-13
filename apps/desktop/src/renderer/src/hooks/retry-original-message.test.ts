/**
 * luna（#147 后续）：重试失败轮不走续跑 Todo 的合成提示（内部英文提示会漏进聊天），要重发用户原话。
 * 行为测试：走真 regenerateAssistantTurn，抓 main 收到的 agent.run 入参。
 */
import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"
import { TODO_CONTINUE_PROMPT } from "@enjoy-agents/ipc-contract"

const runs: Array<{ messages: Array<{ role: string; content: string }>; todoContinue?: boolean }> = []
;(globalThis as { window?: unknown }).window = {
  ide: {
    agent: {
      run: async (input: never) => {
        runs.push(input)
        return { ok: true, runId: `run_retry_${runs.length}` }
      }
    },
    session: { messages: async () => [] }
  }
}
const { useChatStore } = await import("../stores/chat-store.ts")
const { regenerateAssistantTurn } = await import("./regenerate-turn.ts")

beforeEach(() => {
  runs.length = 0
  useChatStore.setState({
    workspaceId: "ws_retry",
    sessionId: "ses_retry",
    runtimeId: "enjoy-local",
    running: false,
    error: null,
    messages: [
      { id: "u1", role: "user", content: "帮我写个排序函数", createdAt: 1 },
      { id: "msg_pending_1", role: "assistant", content: "", createdAt: 2, tools: [] }
    ]
  } as never)
})

test("失败（空）助手轮重试：main 收到用户原话，不是续跑合成提示", async () => {
  await regenerateAssistantTurn("msg_pending_1")
  assert.equal(runs.length, 1)
  const last = runs[0]!.messages.filter((message) => message.role === "user").at(-1)!
  assert.equal(last.content, "帮我写个排序函数")
  assert.ok(!runs[0]!.messages.some((message) => message.content.includes(TODO_CONTINUE_PROMPT)))
  assert.notEqual(runs[0]!.todoContinue, true)
})

test("本轮用户句就是续跑句：仍走续跑（带 todoContinue 标记）", async () => {
  useChatStore.setState({
    messages: [
      { id: "u0", role: "user", content: "做个 todo app", createdAt: 0 },
      { id: "a0", role: "assistant", content: "计划", createdAt: 1 },
      { id: "u1", role: "user", content: TODO_CONTINUE_PROMPT, createdAt: 2 },
      { id: "msg_pending_1", role: "assistant", content: "", createdAt: 3, tools: [] }
    ]
  } as never)
  await regenerateAssistantTurn("msg_pending_1")
  assert.equal(runs.length, 1)
  assert.equal(runs[0]!.todoContinue, true)
})
