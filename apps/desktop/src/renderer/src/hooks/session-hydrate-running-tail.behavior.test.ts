/**
 * #160 巡检 5（luna 6-02b）：切回还在跑 / 等审批的会话 B，库行回灌不能把最后一轮当成已结束——
 * 思考行要说「正在运行工具」而不是「已运行 1 个工具」，结束态按钮（AssistantActions）不提前出来。
 * 真走 applySessionHydrate（切会话，sameSession=false），再用 thinkingHeadline 看思考行文案。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { readFileSync } from "node:fs"
const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: () => (/\.on[A-Z]\w*$/.test(path) ? () => undefined : Promise.resolve(undefined))
  })
}
;(globalThis as any).window = { ide: bridge("") }
const { useChatStore } = await import("../stores/chat-store.ts")
const { useAttentionStore } = await import("../stores/attention/attention-store.ts")
const { applySessionHydrate } = await import("./session-hydrate.ts")
const { markRunningTail } = await import("./mark-running-tail.ts")
const { thinkingHeadline } = await import("../components/ai-chat/thread/thinking/thinking-rows.ts")
const { zhChat } = await import("../i18n/catalogs/zh/chat.ts")
const { interpolate } = await import("../i18n/lookup.ts")
const t = (key: string, vars?: Record<string, string | number>) => interpolate((zhChat as any)[key.replace(/^chat\./, "")] ?? key, vars)

afterEach(() => useAttentionStore.setState({ parks: {} } as never))

const toolPart = { type: "tool-write_file", toolCallId: "tc1", state: "input-available", input: { path: "a.txt" } }
function rows() {
  return [
    { id: "u_a", role: "user" as const, content: "第一轮", createdAt: 1 },
    { id: "a_a", role: "assistant" as const, content: "做完了", createdAt: 2 },
    { id: "u_b", role: "user" as const, content: "写个文件", createdAt: 3 },
    { id: "a_b", role: "assistant" as const, content: "", createdAt: 4, parts: [toolPart] }
  ]
}
function hydrate(sessionId: string, opts: { sessionRunning?: boolean; parkRunning?: boolean; storeRunning?: boolean }) {
  // storeRunning：loadSession 里 restoreComposerForSession 已把停车档的 running/runId 搬进前台 store。
  const live = opts.storeRunning ? { running: true, runId: "run_live" } : { running: false, runId: null }
  useChatStore.setState({ sessionId, messages: [], ...live, notice: null, error: null } as never)
  if (opts.parkRunning) useAttentionStore.setState({ parks: { [sessionId]: { running: true } } } as never)
  const ok = applySessionHydrate({ dbRows: rows(), sameSession: false, generation: 0, sessionId, sessionRunning: opts.sessionRunning })
  assert.equal(ok, true)
  return useChatStore.getState().messages
}

test("切回还在跑的会话（main 说在跑、前台 store 也在跑）：最后一轮助手话是 streaming，思考行现在时，不说「已运行 1 个工具」", () => {
  const messages = hydrate("ses_B", { sessionRunning: true, storeRunning: true })
  const tail = messages.at(-1)!
  assert.equal(tail.role, "assistant")
  assert.equal(tail.streaming, true)
  assert.equal(messages[1]!.streaming ?? false, false, "更早那轮不动")
  const headline = thinkingHeadline(Boolean(tail.streaming), (tail.tools ?? []) as never, null, t as never)
  assert.notEqual(headline, zhChat.ranToolsOne)
})

test("切回还在等审批的会话（main 说在跑 + 停车档 running）：同样标 streaming", () => {
  const messages = hydrate("ses_B2", { sessionRunning: true, parkRunning: true })
  assert.equal(messages.at(-1)!.streaming, true)
})

test("main 说在跑，但此刻停车档 / 前台 store 都已空闲（一轮刚结束）：不标 streaming", () => {
  const messages = hydrate("ses_B3", { sessionRunning: true })
  assert.ok(!messages.at(-1)!.streaming)
})

test("main 说空闲、停车档还残留 running：信 main，不标 streaming（leo #164 P3）", () => {
  const messages = hydrate("ses_B4", { sessionRunning: false, parkRunning: true })
  assert.ok(!messages.at(-1)!.streaming)
})

test("mainRunning 单独给时以它为准：sessionRunning（含停车档）为 true、main 空闲 → 不标", () => {
  useChatStore.setState({ sessionId: "ses_B5", messages: [], running: true, runId: "run_x" } as never)
  useAttentionStore.setState({ parks: {} } as never)
  applySessionHydrate({ dbRows: rows(), sameSession: false, generation: 0, sessionId: "ses_B5", sessionRunning: true, mainRunning: false })
  assert.ok(!useChatStore.getState().messages.at(-1)!.streaming)
})

test("loadSession 把 main 的结论单独交给 applySessionHydrate（源码正则）", () => {
  const src = readFileSync(new URL("./session-lifecycle.ts", import.meta.url), "utf8")
  assert.match(src, /const mainRunning = mainSays === true/)
  assert.match(src, /sessionRunning,\s*mainRunning\s*\}\)/)
})

test("会话不在跑：照旧按已结束显示（不标 streaming）", () => {
  const messages = hydrate("ses_done", {})
  assert.ok(!messages.at(-1)!.streaming)
})

test("markRunningTail：只标最后一条用户话之后的助手话；用户话之后还没助手话就不动；已是 streaming 原样返回", () => {
  const m = [
    { role: "user" }, { role: "assistant" }, { role: "user" }, { role: "assistant" }
  ]
  assert.deepEqual(markRunningTail(m, true).map((x: any) => Boolean(x.streaming)), [false, false, false, true])
  const noTail = [{ role: "user" }, { role: "assistant" }, { role: "user" }]
  assert.equal(markRunningTail(noTail, true), noTail)
  const already = [{ role: "user" }, { role: "assistant", streaming: true }]
  assert.equal(markRunningTail(already, true), already)
  assert.equal(markRunningTail(m, false), m)
})

test("结束态按钮只在非 streaming 时画（源码正则）：标了 streaming 就不会提前出来", () => {
  const src = readFileSync(new URL("../components/ai-chat/thread/turns/assistant-turn.tsx", import.meta.url), "utf8")
  assert.match(src, /!message\.streaming && surface\.hasBody \? <AssistantActions/)
})
