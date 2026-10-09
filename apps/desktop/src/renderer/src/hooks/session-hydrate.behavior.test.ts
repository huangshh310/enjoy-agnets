/**
 * 回灌行为：新建 / 种子首发要出气泡和卡，切走再切回消息还在。
 * 不用生产 chat-store（它 value-import 合约入口，node:test 加载不到）。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { create } from "zustand"
import { bumpSessionHydrateGeneration, isSessionHydrateCurrent } from "./session-hydrate-generation.ts"
import { pickHydratedMessages } from "./pick-hydrated-messages.ts"

type LiveMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  streaming?: boolean
  tools?: Array<{ id: string; name: string; state: string }>
}

type HydrateStore = {
  sessionId: string | null
  messages: LiveMessage[]
  running: boolean
  pendingApproval: { approvalId: string; name: string } | null
  setSession: (sessionId: string) => void
  setMessages: (messages: LiveMessage[]) => void
}

const useStore = create<HydrateStore>((set) => ({
  sessionId: null,
  messages: [],
  running: false,
  pendingApproval: null,
  setSession: (sessionId) => set({ sessionId }),
  setMessages: (messages) => set({ messages })
}))

function resetStore() {
  useStore.setState({
    sessionId: null,
    messages: [],
    running: false,
    pendingApproval: null
  })
}

function optimisticTurn(content: string): LiveMessage[] {
  return [
    { id: "msg_user_live", role: "user", content },
    {
      id: "msg_pending_live",
      role: "assistant",
      content: "",
      streaming: true,
      tools: [{ id: "tool_stub", name: "write_file", state: "approval-requested" }]
    }
  ]
}

function finishHydrate(
  generation: number,
  sessionId: string,
  dbMessages: LiveMessage[],
  sameSession: boolean
) {
  if (!isSessionHydrateCurrent(generation)) return
  if (useStore.getState().sessionId !== sessionId) return
  const latest = useStore.getState()
  latest.setMessages(
    pickHydratedMessages({
      dbMessages,
      liveMessages: latest.messages,
      sameSession,
      running: latest.running
    })
  )
}

function sendFirstTurn(sessionId: string, sameSessionAtLoad: boolean) {
  useStore.getState().setSession(sessionId)
  if (!sameSessionAtLoad) useStore.getState().setMessages([])
  const generation = bumpSessionHydrateGeneration()
  useStore.setState({
    messages: optimisticTurn("hello stub"),
    running: true,
    pendingApproval: { approvalId: "apr_stub", name: "write_file" }
  })
  bumpSessionHydrateGeneration()
  finishHydrate(generation, sessionId, [], sameSessionAtLoad)
  return useStore.getState()
}

test("新建对话首次发送：空库回灌不得洗掉气泡和审批卡", () => {
  resetStore()
  useStore.getState().setSession("ses_seed")
  const next = sendFirstTurn("ses_new", false)
  assert.equal(next.messages.length, 2)
  assert.equal(next.messages[0]?.content, "hello stub")
  assert.equal(next.pendingApproval?.approvalId, "apr_stub")
  assert.equal(next.running, true)
})

test("种子会话首次发送：启动 loadSession 晚到仍保住气泡和卡", () => {
  resetStore()
  const next = sendFirstTurn("ses_seed", true)
  assert.equal(next.messages.length, 2)
  assert.equal(next.messages[1]?.tools?.[0]?.state, "approval-requested")
  assert.equal(next.pendingApproval?.name, "write_file")
})

test("切走再切回：库里的消息仍回到主区", () => {
  resetStore()
  const rows: LiveMessage[] = [
    { id: "msg_user_db", role: "user", content: "hello stub" },
    { id: "msg_asst_db", role: "assistant", content: "stub-ok hello stub" }
  ]
  useStore.getState().setSession("ses_a")
  useStore.setState({ messages: optimisticTurn("hello stub"), running: false })

  const leave = bumpSessionHydrateGeneration()
  useStore.getState().setSession("ses_b")
  useStore.getState().setMessages([])
  finishHydrate(leave, "ses_b", [], false)
  assert.equal(useStore.getState().messages.length, 0)

  const back = bumpSessionHydrateGeneration()
  useStore.getState().setSession("ses_a")
  useStore.getState().setMessages([])
  finishHydrate(back, "ses_a", rows, false)
  const restored = useStore.getState().messages
  assert.equal(restored.length, 2)
  assert.equal(restored[0]?.content, "hello stub")
  assert.equal(restored[1]?.content, "stub-ok hello stub")
})
