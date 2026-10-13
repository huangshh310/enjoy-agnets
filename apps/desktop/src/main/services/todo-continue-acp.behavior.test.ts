/**
 * leo #148 M1：ACP 下续跑 Todo 的内部提示（垫了宿主模式围栏）不得当用户句落库 / 显示。
 * 走真 continueTodoTurn（ACP 运行时 + plan 模式）抓 agent.run 入参，再交给 main 的落库判定。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { RunAgentInput, TODO_CONTINUE_PROMPT } from "@enjoy-agents/ipc-contract"

const runs: unknown[] = []
;(globalThis as { window?: unknown }).window = {
  ide: {
    agent: {
      run: async (input: unknown) => {
        runs.push(input)
        return { ok: true, runId: "run_acp_continue" }
      }
    }
  }
}
const { useChatStore } = await import("../../renderer/src/stores/chat-store.ts")
const { continueTodoTurn } = await import("../../renderer/src/hooks/continue-todo-turn.ts")
const { shouldPersistOutgoingUser } = await import("./outgoing-user-persist.ts")

test("ACP + plan 模式续跑：提示带围栏，main 不落库", async () => {
  useChatStore.setState({
    workspaceId: "ws_acp",
    sessionId: "ses_acp",
    runtimeId: "claude",
    mode: "plan",
    running: false,
    messages: [
      { id: "u1", role: "user", content: "做个 todo app", createdAt: 1 },
      { id: "a1", role: "assistant", content: "计划如下", createdAt: 2 }
    ]
  } as never)
  await continueTodoTurn()
  assert.equal(runs.length, 1)
  const input = RunAgentInput.parse(runs[0])
  const last = input.messages.at(-1)!
  assert.match(String(last.content), /\[Enjoy host mode:/)
  assert.ok(String(last.content).includes(TODO_CONTINUE_PROMPT))
  assert.equal(shouldPersistOutgoingUser(input, input.persistUser !== false), false)
  // 即便漏了 persistUser:false，显式标记也拦得住
  assert.equal(shouldPersistOutgoingUser({ ...input, persistUser: undefined }, true), false)
})

test("文本兜底：没有标记、但内容是带围栏的续跑句，也不落库", () => {
  const fenced = `[Enjoy host mode: plan]\nbody\n[/Enjoy host mode]\n\n${TODO_CONTINUE_PROMPT}`
  const input = RunAgentInput.parse({
    workspaceId: "ws",
    sessionId: "s",
    modelId: "m",
    messages: [{ role: "user", content: fenced }]
  })
  assert.equal(shouldPersistOutgoingUser(input, true), false)
  const normal = RunAgentInput.parse({ ...input, messages: [{ role: "user", content: "正常问题" }] })
  assert.equal(shouldPersistOutgoingUser(normal, true), true)
})
