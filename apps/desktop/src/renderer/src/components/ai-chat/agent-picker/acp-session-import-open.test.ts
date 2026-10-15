import assert from "node:assert/strict"
import { test } from "node:test"

const { useChatStore } = await import("../../../stores/chat-store.ts")
const pending = await import("../../../hooks/session-history-pending.ts")
const { openImportedAcpSession } = await import("./acp-session-import-open.ts")

function stillLoading(sessionId: string): boolean {
  const state = useChatStore.getState()
  return pending.sessionHistoryPending({
    sessionId: state.sessionId,
    messageCount: state.messages.length,
    running: state.running,
    hydrated: pending.isSessionHistoryHydrated(sessionId),
    timedOut: false
  })
}

test("ACP 导入后切到导入的会话：不停在加载中（从别的会话导入）", () => {
  useChatStore.setState({ sessionId: "ses_before_import", messages: [], running: false })
  openImportedAcpSession({ id: "ses_acp_1", title: "导入的会话" }, "claude-code")
  assert.equal(useChatStore.getState().sessionId, "ses_acp_1")
  assert.equal(useChatStore.getState().messages.length, 0)
  assert.equal(stillLoading("ses_acp_1"), false)
})

test("ACP 导入后切到导入的会话：从空首页导入、或导入的会话以前打开过，也不停在加载中", () => {
  useChatStore.setState({ sessionId: null, messages: [], running: false })
  openImportedAcpSession({ id: "ses_acp_2", title: "导入的会话 2" }, "claude-code")
  assert.equal(stillLoading("ses_acp_2"), false)
  useChatStore.setState({ sessionId: "ses_other" })
  openImportedAcpSession({ id: "ses_acp_2", title: "导入的会话 2" }, "claude-code")
  assert.equal(stillLoading("ses_acp_2"), false)
})
