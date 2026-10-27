/**
 * leo #164 S2 / S4：走真的 loadSession（不是直接调 applySessionHydrate）。
 * LS1/LS2/LS3 搬自 leo 的 /tmp/rv164b/probe2.behavior.test.ts；S4 在 LS3 上加断言：main 说空闲、停车档残留 running 时，
 * 前台 store 也收回空闲（没有停止键、能发）。另加两条对照：停车档还没 runId（刚发出）、main 查询失败 → 照旧恢复。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
const over: Record<string, (...a: any[]) => any> = {}
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _this, args) => {
      if (over[path]) return Promise.resolve(over[path]!(...args))
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      return Promise.resolve(path.endsWith(".list") ? [] : undefined)
    }
  })
}
;(globalThis as any).window = { ide: bridge(""), matchMedia: () => ({ matches: true }), addEventListener() {}, removeEventListener() {} }
;(globalThis as any).document ??= { querySelector: () => null, addEventListener() {}, removeEventListener() {}, activeElement: null }
const { useChatStore } = await import("../stores/chat-store.ts")
const { useAttentionStore } = await import("../stores/attention/attention-store.ts")
const { dispatchAgentEvent } = await import("../stores/attention/dispatch-agent-event.ts")
const { loadSession } = await import("./session-lifecycle.ts")
const { clearThreadPaintCache } = await import("./thread-paint-cache.ts")
const toolPart = { type: "tool-write_file", toolCallId: "tc1", state: "input-available", input: { path: "a.txt" } }
const rows = () => [
  { id: "u1", role: "user", content: "写个文件", createdAt: 3 },
  { id: "a1", role: "assistant", content: "partial", createdAt: 4, parts: [{ type: "text", text: "partial" }, toolPart] }
]
function mainSays(sessionId: string, runId: string | null, onMessages?: () => void) {
  over[".agent.sessionActive"] = (i: any) => (i.sessionId === sessionId && runId ? { running: true, runId } : { running: false, runId: null })
  over[".session.messages"] = () => { onMessages?.(); return rows() }
  over[".inbox.listPendingApprovals"] = () => ({ items: [], restoreSettled: true })
}
function freshRenderer() {
  clearThreadPaintCache()
  useAttentionStore.setState({ items: [], parks: {}, runSessions: {} } as never)
  useChatStore.setState({ sessionId: null, running: false, runId: null, messages: [], pendingApproval: null, error: null, notice: null, pendingStreamEvents: [] } as never)
}
const tail = () => useChatStore.getState().messages.at(-1) as any
afterEach(() => { for (const k of Object.keys(over)) delete over[k] })

test("LS1 真 loadSession 竞态：A→B（B 停车档在跑），run.end 落在 await session.messages 期间 → 不留进行中", async () => {
  freshRenderer()
  useChatStore.setState({ sessionId: "ses_A", running: false } as never)
  useAttentionStore.setState({ parks: { ses_B: { sessionId: "ses_B", runId: "run_b", running: true, runStartedAt: 1, pendingApproval: null, error: null, notice: null, thinkingLabel: "Thinking", pendingStreamEvents: [] } } } as never)
  mainSays("ses_B", "run_b", () => dispatchAgentEvent({ type: "run.end", runId: "run_b", sessionId: "ses_B" } as never))
  await loadSession("ses_B", "B", () => false)
  const s = useChatStore.getState()
  assert.equal(s.running, false)
  assert.ok(!tail()?.streaming, "stale streaming tail after real loadSession race")
})
test("LS2 对照：A→B 还在跑、没 run.end → 尾巴 streaming，store running", async () => {
  freshRenderer()
  useChatStore.setState({ sessionId: "ses_A", running: false } as never)
  useAttentionStore.setState({ parks: { ses_B: { sessionId: "ses_B", runId: "run_b", running: true, runStartedAt: 1, pendingApproval: null, error: null, notice: null, thinkingLabel: "Thinking", pendingStreamEvents: [] } } } as never)
  mainSays("ses_B", "run_b")
  await loadSession("ses_B", "B", () => false)
  const s = useChatStore.getState()
  assert.equal(s.running, true)
  assert.equal(tail()?.streaming, true)
})
test("LS3 / S4 main 说空闲、停车档残留 running：尾巴不标，前台也收回空闲（没有停止键、能发）", async () => {
  freshRenderer()
  useChatStore.setState({ sessionId: "ses_A", running: false } as never)
  useAttentionStore.setState({ parks: { ses_S: { sessionId: "ses_S", runId: "run_s", running: true, runStartedAt: 1, pendingApproval: null, error: null, notice: null, thinkingLabel: "Thinking", pendingStreamEvents: [] } } } as never)
  mainSays("ses_S", null)
  await loadSession("ses_S", "S", () => false)
  const s = useChatStore.getState()
  assert.ok(!tail()?.streaming)
  assert.equal(s.running, false, "停止键不该出现")
  assert.equal(s.runId, null)
  assert.equal(s.pendingApproval, null)
  assert.equal(s.lastRunId, "run_s", "上一轮 id 留着（重试 / 失败卡用）")
  assert.equal(useAttentionStore.getState().parks["ses_S"], undefined, "停车档已取走")
})

function parkS(runId: string | null) {
  useAttentionStore.setState({ parks: { ses_S: { sessionId: "ses_S", runId, running: true, runStartedAt: 1, pendingApproval: null, error: null, notice: null, thinkingLabel: "Thinking", pendingStreamEvents: [] } } } as never)
}

test("S4 对照：停车档还没 runId（刚发出、main 还没登记）→ 不当成已结束，照旧恢复 running", async () => {
  freshRenderer()
  useChatStore.setState({ sessionId: "ses_A", running: false } as never)
  parkS(null)
  mainSays("ses_S", null)
  await loadSession("ses_S", "S", () => false)
  assert.equal(useChatStore.getState().running, true)
})

test("S4 对照：main 查询失败（不知道）→ 不当成空闲，照旧恢复停车档", async () => {
  freshRenderer()
  useChatStore.setState({ sessionId: "ses_A", running: false } as never)
  parkS("run_s")
  mainSays("ses_S", null)
  over[".agent.sessionActive"] = () => { throw new Error("ipc down") }
  await loadSession("ses_S", "S", () => false)
  const s = useChatStore.getState()
  assert.equal(s.running, true)
  assert.equal(s.runId, "run_s")
})

// leo rv164c 软项 N1：停车档过期（main 说空闲）时 sessionRunning 必须是 false——库里没收尾的工具要封口，库里的失败红卡要还原。
// 变异「sessionRunning = mainRunning || parkedRunning」（不看 parkIsStale）原来存活。
test("N1 停车档过期 + main 空闲：没收尾的工具封口（不转圈），库里的失败红卡还原", async () => {
  freshRenderer()
  useChatStore.setState({ sessionId: "ses_A", running: false } as never)
  parkS("run_s")
  mainSays("ses_S", null)
  over[".session.messages"] = () => [
    { id: "u1", role: "user", content: "写个文件", createdAt: 3 },
    {
      id: "a1",
      role: "assistant",
      content: "partial",
      createdAt: 4,
      parts: [{ type: "tool", toolCallId: "tc1", name: "write_file", args: { path: "a.txt" }, state: "input-available" }]
    }
  ]
  over[".session.lastError"] = (i: any) => (i.sessionId === "ses_S" ? { runId: "run_s", message: "上游 502" } : null)
  await loadSession("ses_S", "S", () => false)
  const s = useChatStore.getState()
  const tool = (tail()?.tools ?? [])[0]
  assert.ok(tool, "库里那个工具回灌出来了")
  assert.equal(tool.state, "output-error", "封口，不停在 input-available 转圈")
  assert.equal(s.error, "上游 502", "库里的失败红卡还原")
  assert.equal(s.running, false)
})

// leo rv164c 软项 N5：main 回包里 running 不是布尔（缺字段 / 字符串）= 不知道，不能当成空闲去收停车档。
for (const [label, reply] of [
  ["缺 running 字段", { runId: null }],
  ["running 是字符串", { running: "false", runId: null }],
  ["回包是 null", null]
] as const) {
  test(`N5 main 回包不是布尔（${label}）→ 不当成空闲，照旧恢复停车档`, async () => {
    freshRenderer()
    useChatStore.setState({ sessionId: "ses_A", running: false } as never)
    parkS("run_s")
    mainSays("ses_S", null)
    over[".agent.sessionActive"] = () => reply
    await loadSession("ses_S", "S", () => false)
    const s = useChatStore.getState()
    assert.equal(s.running, true)
    assert.equal(s.runId, "run_s")
  })
}
