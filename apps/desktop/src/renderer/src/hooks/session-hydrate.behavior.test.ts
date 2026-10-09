/**
 * 真实 chat-store 上回灌：新建 / 种子首发要出气泡和卡，切走再切回消息还在。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { useChatStore } from "../stores/chat-store.ts"
import type { ThreadMessage } from "../stores/chat-store.types.ts"
import {
  applySessionHydrate,
  bumpSessionHydrateGeneration,
  isSessionHydrateCurrent
} from "./session-hydrate.ts"
import type { SessionMessageRow } from "./hydrate-thread.ts"

const approval = {
  type: "approval.required" as const,
  runId: "run_stub",
  toolCallId: "tool_stub",
  approvalId: "apr_stub",
  name: "write_file",
  args: { path: "e2e-stub.txt", content: "from stub" }
}

function resetStore() {
  useChatStore.setState({
    sessionId: null,
    sessionTitle: "新对话",
    messages: [],
    running: false,
    runId: null,
    pendingApproval: null,
    composer: "",
    error: null
  })
}

function optimisticTurn(content: string): ThreadMessage[] {
  return [
    { id: "msg_user_live", role: "user", content, createdAt: 1 },
    {
      id: "msg_pending_live",
      role: "assistant",
      content: "",
      createdAt: 2,
      streaming: true,
      tools: [
        {
          id: "tool_stub",
          name: "write_file",
          state: "approval-requested",
          args: approval.args
        }
      ]
    }
  ]
}

function finishHydrate(
  generation: number,
  sessionId: string,
  dbRows: SessionMessageRow[],
  sameSession: boolean
) {
  if (!isSessionHydrateCurrent(generation)) return
  if (useChatStore.getState().sessionId !== sessionId) return
  applySessionHydrate({ dbRows, sameSession })
}

function sendFirstTurn(sessionId: string, title: string, sameSessionAtLoad: boolean) {
  useChatStore.getState().setSession(sessionId, title)
  if (!sameSessionAtLoad) useChatStore.getState().setMessages([])
  const generation = bumpSessionHydrateGeneration()
  const live = optimisticTurn("hello stub")
  useChatStore.setState({
    messages: live,
    running: true,
    runId: "run_stub",
    pendingApproval: approval,
    composer: ""
  })
  bumpSessionHydrateGeneration()
  finishHydrate(generation, sessionId, [], sameSessionAtLoad)
  return useChatStore.getState()
}

test("新建对话首次发送：空库回灌不得洗掉气泡和审批卡", () => {
  resetStore()
  useChatStore.getState().setSession("ses_seed", "New agent")
  const next = sendFirstTurn("ses_new", "新对话", false)
  assert.equal(next.messages.length, 2)
  assert.equal(next.messages[0]?.content, "hello stub")
  assert.equal(next.pendingApproval?.approvalId, "apr_stub")
  assert.equal(next.running, true)
})

test("种子会话首次发送：启动 loadSession 晚到仍保住气泡和卡", () => {
  resetStore()
  const next = sendFirstTurn("ses_seed", "New agent", true)
  assert.equal(next.messages.length, 2)
  assert.equal(next.messages[1]?.tools?.[0]?.state, "approval-requested")
  assert.equal(next.pendingApproval?.name, "write_file")
})

test("切走再切回：库里的消息仍回到主区", () => {
  resetStore()
  const rows: SessionMessageRow[] = [
    { id: "msg_user_db", role: "user", content: "hello stub", createdAt: 1 },
    { id: "msg_asst_db", role: "assistant", content: "stub-ok hello stub", createdAt: 2 }
  ]
  useChatStore.getState().setSession("ses_a", "新对话")
  useChatStore.setState({ messages: optimisticTurn("hello stub"), running: false })

  const leave = bumpSessionHydrateGeneration()
  useChatStore.getState().setSession("ses_b", "New agent")
  useChatStore.getState().setMessages([])
  finishHydrate(leave, "ses_b", [], false)
  assert.equal(useChatStore.getState().messages.length, 0)

  const back = bumpSessionHydrateGeneration()
  useChatStore.getState().setSession("ses_a", "新对话")
  useChatStore.getState().setMessages([])
  finishHydrate(back, "ses_a", rows, false)
  const restored = useChatStore.getState().messages
  assert.equal(restored.length, 2)
  assert.equal(restored[0]?.content, "hello stub")
  assert.equal(restored[1]?.content, "stub-ok hello stub")
})
