/**
 * 挂载审查栏（非 git + 本轮已允许写盘）：selector 必须稳定。
 * renderer 测试是 node:test + strip-types，没有 jsdom；按 ChangesList /
 * ReviewDiffPane / ReviewNotGitEmpty 的真实订阅方式模拟 useSyncExternalStore。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { create } from "zustand"
import { pathsFromLastTurn } from "./last-turn-paths.ts"
import type { ThreadMessage } from "../../../../../stores/chat-store.types.ts"

const writeTurn: ThreadMessage[] = [
  { id: "u1", role: "user", content: "please write a note", createdAt: 1 },
  {
    id: "a1",
    role: "assistant",
    content: "stub-ok allowed write",
    createdAt: 2,
    tools: [
      {
        id: "tool_stub_1",
        name: "write_file",
        state: "output-available",
        args: { path: "e2e-stub.txt", content: "from stub" }
      }
    ]
  }
]

type ReviewPanelStore = {
  messages: ThreadMessage[]
  gitRepo: boolean | null
  bump: () => void
}

function createReviewPanelStore() {
  return create<ReviewPanelStore>((set) => ({
    messages: writeTurn,
    gitRepo: false,
    bump: () => set((state) => ({ messages: state.messages, gitRepo: state.gitRepo }))
  }))
}

/** 审查栏真实挂载：primitive gitRepo + messages 引用，再 memo 本轮 path。 */
function mountReviewPanel(store: ReturnType<typeof createReviewPanelStore>) {
  const select = () => {
    const state = store.getState()
    return { messages: state.messages, gitRepo: state.gitRepo }
  }
  let prev = select()
  let renders = 1
  const MAX = 20
  while (renders < MAX) {
    const next = select()
    if (Object.is(prev.messages, next.messages) && Object.is(prev.gitRepo, next.gitRepo)) {
      return {
        renders,
        gitRepo: next.gitRepo,
        ledger: pathsFromLastTurn(next.messages)
      }
    }
    prev = next
    renders += 1
  }
  throw new Error("Maximum update depth exceeded")
}

test("非 git 审查栏挂载：空态列出 e2e-stub.txt，同引用不炸", () => {
  const store = createReviewPanelStore()
  const first = mountReviewPanel(store)
  assert.equal(first.gitRepo, false)
  assert.deepEqual(first.ledger, ["e2e-stub.txt"])
  assert.equal(first.renders, 1)

  store.getState().bump()
  const second = mountReviewPanel(store)
  assert.equal(second.renders, 1)
  assert.deepEqual(second.ledger, ["e2e-stub.txt"])
})

test("直接选 path 数组会 Maximum update depth exceeded", () => {
  const store = createReviewPanelStore()
  const unstable = () => pathsFromLastTurn(store.getState().messages)
  assert.equal(Object.is(unstable(), unstable()), false)

  let renders = 0
  const MAX = 20
  let prev = unstable()
  renders = 1
  assert.throws(() => {
    while (renders < MAX) {
      const next = unstable()
      if (Object.is(prev, next)) return
      prev = next
      renders += 1
    }
    throw new Error("Maximum update depth exceeded")
  }, /Maximum update depth/)
})
