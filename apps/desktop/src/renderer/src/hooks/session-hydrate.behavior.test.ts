/**
 * 回灌行为：新建 / 种子首发要出气泡和卡，切走再切回消息还在。
 * 独立 zustand store，但收口走生产 finishSessionHydrate / messagesAfterSessionSwitch。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { create } from "zustand"
import { bumpSessionHydrateGeneration } from "./session-hydrate-generation.ts"
import { applyFinishedHydrate, messagesAfterSessionSwitch } from "./session-hydrate-finish.ts"

type LiveMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  streaming?: boolean
  tools?: Array<{ id: string; name: string; state: string }>
  assets?: Array<{ id: string; name: string }>
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

function applyProductionHydrate(
  generation: number,
  sessionId: string,
  dbMessages: LiveMessage[],
  sameSession: boolean
) {
  const latest = useStore.getState()
  applyFinishedHydrate(
    {
      generation,
      sessionId,
      currentSessionId: latest.sessionId,
      dbMessages,
      liveMessages: latest.messages,
      sameSession,
      running: latest.running
    },
    (next) => latest.setMessages(next)
  )
}

function beginLoad(sessionId: string) {
  const switched = messagesAfterSessionSwitch({
    currentSessionId: useStore.getState().sessionId,
    nextSessionId: sessionId,
    liveMessages: useStore.getState().messages
  })
  useStore.getState().setSession(sessionId)
  if (!switched.sameSession) useStore.getState().setMessages(switched.messages)
  return { generation: bumpSessionHydrateGeneration(), sameSession: switched.sameSession }
}

function sendFirstTurn(sessionId: string) {
  const load = beginLoad(sessionId)
  useStore.setState({
    messages: optimisticTurn("hello stub"),
    running: true,
    pendingApproval: { approvalId: "apr_stub", name: "write_file" }
  })
  bumpSessionHydrateGeneration()
  applyProductionHydrate(load.generation, sessionId, [], load.sameSession)
  return useStore.getState()
}

test("新建对话首次发送：空库回灌不得洗掉气泡和审批卡", () => {
  resetStore()
  useStore.getState().setSession("ses_seed")
  const next = sendFirstTurn("ses_new")
  assert.equal(next.messages.length, 2)
  assert.equal(next.messages[0]?.content, "hello stub")
  assert.equal(next.pendingApproval?.approvalId, "apr_stub")
  assert.equal(next.running, true)
})

test("种子会话首次发送：启动 loadSession 晚到仍保住气泡和卡", () => {
  resetStore()
  const next = sendFirstTurn("ses_seed")
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

  const leave = beginLoad("ses_b")
  applyProductionHydrate(leave.generation, "ses_b", [], leave.sameSession)
  assert.equal(useStore.getState().messages.length, 0)

  const back = beginLoad("ses_a")
  applyProductionHydrate(back.generation, "ses_a", rows, back.sameSession)
  const restored = useStore.getState().messages
  assert.equal(restored.length, 2)
  assert.equal(restored[0]?.content, "hello stub")
  assert.equal(restored[1]?.content, "stub-ok hello stub")
})

test("发送加世代后，迟到的历史回灌仍合并进乐观轮", () => {
  resetStore()
  useStore.getState().setSession("ses_a")
  const history: LiveMessage[] = [
    { id: "msg_old_user", role: "user", content: "old turn" },
    { id: "msg_old_asst", role: "assistant", content: "old reply" }
  ]
  const load = beginLoad("ses_a")
  useStore.setState({
    messages: optimisticTurn("hello stub"),
    running: true,
    pendingApproval: { approvalId: "apr_live", name: "write_file" }
  })
  bumpSessionHydrateGeneration()
  applyProductionHydrate(load.generation, "ses_a", history, load.sameSession)
  const next = useStore.getState()
  assert.equal(next.messages.some((message) => message.id === "msg_old_user"), true)
  assert.equal(next.messages.some((message) => message.id === "msg_old_asst"), true)
  assert.equal(next.messages.some((message) => message.id === "msg_user_live"), true)
  assert.equal(next.messages.some((message) => message.id === "msg_pending_live"), true)
  assert.equal(next.pendingApproval?.approvalId, "apr_live")
})

test("从有消息的会话 A 切到空会话 B：B 不得留下 A 的消息和附件", () => {
  resetStore()
  useStore.getState().setSession("ses_a")
  useStore.setState({
    messages: [
      {
        id: "msg_a_user",
        role: "user",
        content: "from A",
        assets: [{ id: "ast_a", name: "shot.png" }]
      },
      { id: "msg_a_asst", role: "assistant", content: "reply A" }
    ],
    running: false
  })
  const load = beginLoad("ses_b")
  applyProductionHydrate(load.generation, "ses_b", [], load.sameSession)
  const next = useStore.getState()
  assert.equal(load.sameSession, false)
  assert.equal(next.sessionId, "ses_b")
  assert.equal(next.messages.length, 0)
  assert.equal(
    next.messages.some((message) => (message.assets?.length ?? 0) > 0),
    false
  )
})
