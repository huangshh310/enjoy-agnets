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

test("leo #148 三轮 (a)：没有标记时，用户自己发的完整提示 / 带围栏 / 提示加话都照常落库", () => {
  const base = { workspaceId: "ws", sessionId: "s", modelId: "m" }
  const texts = [
    TODO_CONTINUE_PROMPT,
    `[Enjoy host mode: plan]\nbody\n[/Enjoy host mode]\n\n${TODO_CONTINUE_PROMPT}`,
    "The Todo List still has unfinished items. 帮我看看为什么",
    `${TODO_CONTINUE_PROMPT} 另外帮我看看为什么`
  ]
  for (const content of texts) {
    const input = RunAgentInput.parse({ ...base, messages: [{ role: "user", content }] })
    assert.equal(shouldPersistOutgoingUser(input, true), true, content)
  }
  // 标记在、但内容是「提示 + 用户加话」：整句不等，不算内部轮。
  const flaggedExtra = RunAgentInput.parse({
    ...base,
    todoContinue: true,
    messages: [{ role: "user", content: `${TODO_CONTINUE_PROMPT} 另外帮我看看为什么` }]
  })
  assert.equal(shouldPersistOutgoingUser(flaggedExtra, true), true)
})

test("leo #148 三轮 (b)：runAgent 落库开关 → beginAgentRun 判定，普通句带标记仍落库", async () => {
  const { runAgentPersistUser } = await import("./outgoing-user-persist.ts")
  const input = RunAgentInput.parse({
    workspaceId: "ws",
    sessionId: "s",
    modelId: "m",
    todoContinue: true,
    messages: [{ role: "user", content: "帮我把登录页改成深色" }]
  })
  const persistUser = runAgentPersistUser(input)
  assert.equal(persistUser, true)
  assert.equal(shouldPersistOutgoingUser(input, persistUser), true)
  // 真续跑轮（标记 + 整句提示）仍拦。
  const internal = RunAgentInput.parse({ ...input, messages: [{ role: "user", content: TODO_CONTINUE_PROMPT }] })
  assert.equal(shouldPersistOutgoingUser(internal, runAgentPersistUser(internal)), false)
})

test("runAgent 落库开关接线：agent-run-start 用 runAgentPersistUser", async () => {
  const { readFileSync } = await import("node:fs")
  const src = readFileSync(new URL("./agent-run-start.ts", import.meta.url), "utf8")
  assert.match(src, /persistUser: runAgentPersistUser\(input\)/)
})

test("fail-closed：普通句带 todoContinue:true 仍照常落库 / 不算内部轮", async () => {
  const { isInternalTodoContinueTurn } = await import("./outgoing-user-persist.ts")
  const input = RunAgentInput.parse({
    workspaceId: "ws",
    sessionId: "s",
    modelId: "m",
    todoContinue: true,
    messages: [{ role: "user", content: "帮我把登录页改成深色" }]
  })
  assert.equal(isInternalTodoContinueTurn(input), false)
  assert.equal(shouldPersistOutgoingUser(input, true), true)
})
