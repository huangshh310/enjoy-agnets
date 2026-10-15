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

// 接线守护（leo #157 复审）：组件导入成功后必须走 openImportedAcpSession，不能自己内联 setSession。
// 测试环境是 node:test，不能加载 .tsx、也没有 DOM / 测试渲染库，没法渲染组件触发导入，只能读组件源码断言接线。
test("接线：acp-session-import.tsx 导入成功走 openImportedAcpSession，不再直接 setSession / setMessages", async () => {
  const { readFileSync } = await import("node:fs")
  const raw = readFileSync(new URL("./acp-session-import.tsx", import.meta.url), "utf8")
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
  const importRow = src.slice(src.indexOf("async function importRow"), src.indexOf("return (", src.indexOf("async function importRow")))
  assert.ok(importRow.length > 0, "找不到 importRow")
  assert.match(src, /import \{ openImportedAcpSession \} from "\.\/acp-session-import-open"/)
  assert.match(importRow, /openImportedAcpSession\(created, runtimeId\)/)
  for (const direct of ["setSession(", "setMessages(", "setRuntimeId(", "setSessionRuntimes("]) {
    assert.ok(!src.includes(direct), `组件里又直接调用了 ${direct}，导入后会停在加载中`)
  }
})
