/**
 * leo #164 BLOCK ⑤「别误显示进行中」的探针（/tmp/rv164/probe.behavior.test.ts 原样搬入，标题改中文）：
 * P1/P1b 后台会话收到 run.end / run.error → 停车档收掉 running → 切回不标 streaming（R5b 守卫）；
 * P2 loadSession 在 await session.messages 期间 run.end 落地 → 不留永远收不掉的「进行中」；
 * P3 main 说空闲就信它；P4 在 A 停一轮不吞 C 的正常审批；P5 重启补发的 restore_interrupted_running 不顶侧栏时间。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: () => (/\.on[A-Z]\w*$/.test(path) ? () => undefined : Promise.resolve(path.endsWith(".list") || path === ".session.messages" ? [] : undefined))
  })
}
;(globalThis as any).window = { ide: bridge(""), matchMedia: () => ({ matches: true }) }
const { useChatStore } = await import("../stores/chat-store.ts")
const { useAttentionStore } = await import("../stores/attention/attention-store.ts")
const { dispatchAgentEvent } = await import("../stores/attention/dispatch-agent-event.ts")
const { applySessionHydrate } = await import("./session-hydrate.ts")
const { abortComposerRun } = await import("./composer-run-control.ts")
const stopped = await import("../stores/stopped-runs.ts")

afterEach(() => {
  stopped.resetStoppedRunsForTest()
  useAttentionStore.setState({ items: [], parks: {}, runSessions: {} } as never)
})
const toolPart = { type: "tool-write_file", toolCallId: "tc1", state: "input-available", input: { path: "a.txt" } }
const rows = () => [
  { id: "u_b", role: "user" as const, content: "写个文件", createdAt: 3 },
  { id: "a_b", role: "assistant" as const, content: "", createdAt: 4, parts: [toolPart] }
]
const park = (sessionId: string, runId: string) => ({ sessionId, runId, running: true, runStartedAt: 1, pendingApproval: null, error: null, notice: null, thinkingLabel: "Thinking", pendingStreamEvents: [] })

test("P1 后台会话 run.end 经 dispatchAgentEvent 收掉停车档 → 切回不标 streaming", () => {
  useChatStore.setState({ sessionId: "ses_A", running: false, runId: null, messages: [] } as never)
  useAttentionStore.setState({ parks: { ses_B: park("ses_B", "run_b") } } as never)
  dispatchAgentEvent({ type: "run.end", runId: "run_b", sessionId: "ses_B" } as never)
  assert.equal(useAttentionStore.getState().parks["ses_B"]?.running ?? false, false)
  useChatStore.setState({ sessionId: "ses_B", messages: [] } as never)
  applySessionHydrate({ dbRows: rows(), sameSession: false, generation: 0, sessionId: "ses_B", sessionRunning: false })
  assert.ok(!useChatStore.getState().messages.at(-1)!.streaming)
})

test("P1b 后台会话 run.error（停止 / 其它失败）同样 → 切回不标 streaming", () => {
  useChatStore.setState({ sessionId: "ses_A", running: false, runId: null, messages: [] } as never)
  useAttentionStore.setState({ parks: { ses_B: park("ses_B", "run_b") } } as never)
  dispatchAgentEvent({ type: "run.error", runId: "run_b", sessionId: "ses_B", message: "boom" } as never)
  // leo #164 S1：停车档本身也收掉 running（杀 M5b：只记错误不清 running）
  assert.equal(useAttentionStore.getState().parks["ses_B"]?.running ?? false, false)
  useChatStore.setState({ sessionId: "ses_B", messages: [] } as never)
  applySessionHydrate({ dbRows: rows(), sameSession: false, generation: 0, sessionId: "ses_B", sessionRunning: false })
  assert.ok(!useChatStore.getState().messages.at(-1)!.streaming)
})

test("P2 竞态：await session.messages 期间 run.end 落地（开头取到的 sessionRunning=true）→ 尾巴不能停在 streaming", () => {
  useAttentionStore.setState({ parks: {} } as never)
  useChatStore.setState({ sessionId: "ses_B", running: true, runId: "run_b", messages: [], pendingStreamEvents: [] } as never)
  dispatchAgentEvent({ type: "run.end", runId: "run_b", sessionId: "ses_B" } as never)
  assert.equal(useChatStore.getState().running, false, "store already idle")
  applySessionHydrate({ dbRows: rows(), sameSession: false, generation: 0, sessionId: "ses_B", sessionRunning: true })
  assert.ok(!useChatStore.getState().messages.at(-1)!.streaming, "stale streaming tail while store says idle")
})

test("P3 main 空闲、渲染端停车档残留 running → 不标 streaming", () => {
  useChatStore.setState({ sessionId: "ses_S", running: false, runId: null, messages: [] } as never)
  useAttentionStore.setState({ parks: { ses_S: park("ses_S", "run_s") } } as never)
  applySessionHydrate({ dbRows: rows(), sameSession: false, generation: 0, sessionId: "ses_S", sessionRunning: false })
  assert.ok(!useChatStore.getState().messages.at(-1)!.streaming, "renderer park overrides main idle")
})

test("P4 在 ses_A 停一轮，不吞另一个会话 ses_C 的正常审批", async () => {
  useChatStore.setState({ workspaceId: "ws", sessionId: "ses_A", running: true, runId: "run_a", messages: [], pendingStreamEvents: [], pendingApproval: null } as never)
  await abortComposerRun()
  dispatchAgentEvent({ type: "approval.required", runId: "run_c", sessionId: "ses_C", approvalId: "ap_c", toolCallId: "tc_c", name: "write_file", args: { path: "b.txt" } } as never)
  const items = useAttentionStore.getState().items.filter((i: any) => i.sessionId === "ses_C" && i.kind === "pending_approval")
  assert.equal(items.length, 1)
  assert.equal((useAttentionStore.getState().parks["ses_C"] as any)?.pendingApproval?.approvalId, "ap_c")
})

test("P5 重启补发的 restore_interrupted_running run.error 不把侧栏时间顶到现在", () => {
  const now = Date.now()
  useChatStore.setState({ sessionId: "ses_fg", running: false, runId: null, repositories: [
    { id: "ws", name: "ws", kind: "workspace", updatedAt: now - 5 * 3600_000 },
    { id: "ses_old", name: "old", kind: "session", parentId: "ws", updatedAt: now - 48 * 3600_000 }
  ] } as never)
  dispatchAgentEvent({ type: "run.error", runId: "run_old", sessionId: "ses_old", message: "restore_interrupted_running", code: "restore_interrupted_running" } as never)
  const at = useChatStore.getState().repositories.find((n: any) => n.id === "ses_old")!.updatedAt
  assert.equal(at, now - 48 * 3600_000, "restart recovery should not look like fresh activity")
})
