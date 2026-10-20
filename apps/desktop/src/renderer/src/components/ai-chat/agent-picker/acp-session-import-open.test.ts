import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
const calls: Array<{ path: string; args: any[] }> = []
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, args) => {
      calls.push({ path, args })
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      if (path === ".session.drafts.loadSync") return {}
      if (path === ".session.drafts.loadAssetsSync") return {}
      if (path === ".session.messages" || path.endsWith(".list")) return Promise.resolve([])
      return Promise.resolve(undefined)
    }
  })
}
;(globalThis as any).window = { ide: bridge(""), matchMedia: () => ({ matches: true }) }

const { useChatStore } = await import("../../../stores/chat-store.ts")
const { useAttentionStore } = await import("../../../stores/attention/attention-store.ts")
const pending = await import("../../../hooks/session-history-pending.ts")
const { openImportedAcpSession } = await import("./acp-session-import-open.ts")
const { decidePendingApproval } = await import("../../../hooks/decide-pending-approval.ts")
const { abortComposerRun } = await import("../../../hooks/composer-run-control.ts")
const { loadSession } = await import("../../../hooks/session-lifecycle.ts")
const flush = async () => { for (let i = 0; i < 40; i++) await new Promise((r) => setTimeout(r, 0)) }

afterEach(() => {
  useAttentionStore.setState({ parks: {}, runSessions: {}, items: [] } as never)
  calls.length = 0
})

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

test("ACP 导入后切到导入的会话：不停在加载中（从别的会话导入）", async () => {
  useChatStore.setState({ sessionId: "ses_before_import", messages: [], running: false })
  await openImportedAcpSession({ id: "ses_acp_1", title: "导入的会话" }, "claude-code")
  assert.equal(useChatStore.getState().sessionId, "ses_acp_1")
  assert.equal(useChatStore.getState().messages.length, 0)
  assert.equal(stillLoading("ses_acp_1"), false)
})

test("ACP 导入后切到导入的会话：从空首页导入、或导入的会话以前打开过，也不停在加载中", async () => {
  useChatStore.setState({ sessionId: null, messages: [], running: false })
  await openImportedAcpSession({ id: "ses_acp_2", title: "导入的会话 2" }, "claude-code")
  assert.equal(stillLoading("ses_acp_2"), false)
  useChatStore.setState({ sessionId: "ses_other" })
  await openImportedAcpSession({ id: "ses_acp_2", title: "导入的会话 2" }, "claude-code")
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
  assert.match(importRow, /await openImportedAcpSession\(created, runtimeId\)/)
  for (const direct of ["setSession(", "setMessages(", "setRuntimeId(", "setSessionRuntimes("]) {
    assert.ok(!src.includes(direct), `组件里又直接调用了 ${direct}，导入后会停在加载中`)
  }
})

const approvalB = { type: "approval.required", runId: "run_B", sessionId: "ses_B", toolCallId: "tc_B", approvalId: "ap_B", name: "write_file", args: { path: "e2e-stub.txt" } }

/** 会话 B 在跑、停在写盘审批（run_B 已登记到 B）。 */
function bWaitingApproval() {
  useChatStore.setState({
    workspaceId: "ws",
    sessionId: "ses_B",
    sessionTitle: "会话B",
    running: true,
    runId: "run_B",
    lastRunId: "run_B",
    pendingApproval: approvalB,
    composer: "",
    error: null,
    notice: null,
    messages: [
      { id: "uB", role: "user", content: "very slow 乙在跑", createdAt: 1 },
      { id: "aB", role: "assistant", content: "one two", createdAt: 2, streaming: true }
    ]
  } as never)
  useAttentionStore.getState().rememberRun("run_B", "ses_B")
}

test("jojo P1：B 在跑等审批时导入 ACP 会话——导入的会话空闲、没有 B 的审批卡 / 执行中 / 停止，B 停到后台", async () => {
  bWaitingApproval()
  await openImportedAcpSession({ id: "ses_imp", title: "导入的会话" }, "amp")
  await flush()
  const s = useChatStore.getState()
  assert.equal(s.sessionId, "ses_imp")
  assert.equal(s.pendingApproval, null, "导入的会话不挂 B 的审批卡")
  assert.equal(s.messages.length, 0, "导入的会话不显示 B 的消息")
  const park = useAttentionStore.getState().parks.ses_B as any
  assert.equal(park?.running, true, "B 仍在后台跑")
  assert.equal(park?.runId, "run_B")
  assert.equal(park?.pendingApproval?.approvalId, "ap_B", "B 的审批卡停在 B")
  assert.equal(s.running, false, "导入的会话不是执行中")
  assert.equal(s.runId, null)
  assert.equal(s.runtimeId, "amp", "前台引擎是导入的引擎")
})

test("jojo P1：导入的会话里点「批准」/ 停止——不批 B 的审批、不中止 B；回到 B 卡还在，在 B 里批的是 run_B", async () => {
  bWaitingApproval()
  await openImportedAcpSession({ id: "ses_imp", title: "导入的会话" }, "amp")
  await flush()
  calls.length = 0
  await decidePendingApproval("allow")
  await abortComposerRun()
  assert.deepEqual(calls.filter((c) => c.path === ".agent.decide"), [], "不替 B 批")
  assert.deepEqual(calls.filter((c) => c.path === ".ai.abort"), [], "不中止 B")
  useChatStore.setState({ notice: null, error: null } as never)
  await loadSession("ses_B", "会话B")
  await flush()
  const s = useChatStore.getState()
  assert.equal(s.pendingApproval?.approvalId, "ap_B", "回到 B，B 的审批卡还在")
  assert.equal(s.running, true, "B 仍是执行中")
  calls.length = 0
  await decidePendingApproval("allow")
  const decided = calls.filter((c) => c.path === ".agent.decide").map((c) => c.args[0])
  assert.equal(decided.length, 1)
  assert.equal(decided[0].runId, "run_B")
  assert.equal(decided[0].approvalId, "ap_B")
})

test("审批只能批它所在会话的轮：前台审批卡的 run 已知属于别的会话时拒绝", async () => {
  useChatStore.setState({ sessionId: "ses_imp", running: true, runId: "run_B", pendingApproval: approvalB, error: null } as never)
  useAttentionStore.getState().rememberRun("run_B", "ses_B")
  calls.length = 0
  await decidePendingApproval("allow")
  assert.deepEqual(calls.filter((c) => c.path === ".agent.decide"), [], "卡挂错会话时不批")
  assert.ok(useChatStore.getState().error, "给出没有等待中审批的提示")
  // 对照：卡和前台同一会话照常批。
  useChatStore.setState({ sessionId: "ses_B", error: null } as never)
  await decidePendingApproval("allow")
  assert.equal(calls.filter((c) => c.path === ".agent.decide").length, 1)
})
