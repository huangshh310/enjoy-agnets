/**
 * 回灌行为：新建 / 种子首发要出气泡和卡，切走再切回消息还在。
 * 独立 zustand store，但收口走生产 finishSessionHydrate / messagesAfterSessionSwitch。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { create } from "zustand"
import { isToolNotExecuted } from "@enjoy-agents/ipc-contract/approval-not-executed"
import { reduceStreamEvent } from "../stores/apply-stream-event.ts"
import { clearHeldApprovalResolved, holdApprovalResolved, takeHeldApprovalResolved } from "../stores/held-approval-resolved.ts"
import { mapToolStatus } from "../components/ai-chat/thread/thinking/extract-step-fields.ts"
import { bumpSessionHydrateGeneration } from "./session-hydrate-generation.ts"
import { applyFinishedHydrate, messagesAfterSessionSwitch } from "./session-hydrate-finish.ts"
import { preferLiveToolProgress } from "./pick-hydrated-messages.ts"

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

function pendingHydratedThread(): LiveMessage[] {
  return [
    { id: "msg_user_catchup", role: "user", content: "desktop catchup" },
    {
      id: "msg_asst_catchup",
      role: "assistant",
      content: "",
      tools: [{ id: "tool_catchup_4", name: "desktop_act", state: "approval-requested" }]
    }
  ]
}

test("待批切走再切回后 deny：工具行立刻已拒绝，不转圈、不计入已运行", () => {
  resetStore()
  useStore.getState().setSession("ses_pending")
  useStore.setState({
    messages: [
      {
        id: "msg_asst_catchup",
        role: "assistant",
        content: "",
        streaming: true,
        tools: [{ id: "tool_catchup_4", name: "desktop_act", state: "approval-requested" }]
      }
    ],
    running: true,
    pendingApproval: { approvalId: "apr_catchup_4", name: "desktop_act" }
  })

  const leave = beginLoad("ses_other")
  applyProductionHydrate(leave.generation, "ses_other", [], leave.sameSession)
  assert.equal(useStore.getState().messages.length, 0)

  const back = beginLoad("ses_pending")
  applyProductionHydrate(back.generation, "ses_pending", pendingHydratedThread(), back.sameSession)
  const hydrated = useStore.getState().messages
  assert.equal(hydrated[1]?.streaming, undefined)
  assert.equal(hydrated[1]?.tools?.[0]?.state, "approval-requested")

  const patch = reduceStreamEvent(hydrated as never, {
    type: "approval.resolved",
    runId: "run_catchup",
    toolCallId: "tool_catchup_4",
    decision: "deny"
  }, "run_catchup")
  const tool = patch.messages[1]?.tools?.[0]
  assert.ok(tool)
  assert.equal(tool.state, "output-denied")
  assert.equal(isToolNotExecuted(tool), true)
  assert.equal(mapToolStatus(tool.state, tool), "denied")
  assert.notEqual(mapToolStatus(tool.state, tool), "running")
  assert.equal([tool].filter((row) => !isToolNotExecuted(row)).length, 0)
})

test("切回后回灌前 deny：挂起的 resolved 在回灌后立刻折成已拒绝", () => {
  resetStore()
  clearHeldApprovalResolved()
  const leave = beginLoad("ses_other")
  applyProductionHydrate(leave.generation, "ses_other", [], leave.sameSession)

  const back = beginLoad("ses_pending")
  const emptyPatch = reduceStreamEvent([], {
    type: "approval.resolved",
    runId: "run_catchup",
    toolCallId: "tool_catchup_4",
    decision: "deny"
  }, "run_catchup")
  assert.ok(emptyPatch.heldResolved)
  holdApprovalResolved("ses_pending", emptyPatch.heldResolved)

  applyProductionHydrate(back.generation, "ses_pending", pendingHydratedThread(), back.sameSession)
  let messages = useStore.getState().messages
  for (const event of takeHeldApprovalResolved("ses_pending")) {
    const next = reduceStreamEvent(messages as never, event, "run_catchup")
    messages = next.messages as LiveMessage[]
    useStore.getState().setMessages(messages)
  }
  const tool = useStore.getState().messages[1]?.tools?.[0]
  assert.equal(tool?.state, "output-denied")
  assert.equal(isToolNotExecuted(tool), true)
  assert.notEqual(mapToolStatus(tool!.state as never, tool), "running")
})

test("迟到回灌不得用 approval-requested 盖掉已经折过的拒绝", () => {
  const db = pendingHydratedThread()
  const live = [
    db[0]!,
    {
      ...db[1]!,
      tools: [{ id: "tool_catchup_4", name: "desktop_act", state: "output-denied" }]
    }
  ]
  const next = preferLiveToolProgress(db, live)
  assert.equal(next[1]?.tools?.[0]?.state, "output-denied")
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
