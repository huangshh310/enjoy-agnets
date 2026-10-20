/**
 * #160 巡检 5：侧栏会话时间在发出（run.start）和一轮结束（run.end / run.error）时跟着走，不用等整份工作区刷新。
 * 真走 dispatchAgentEvent；标题精炼之类的旁路 completion 不算。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync } from "node:fs"
const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: () => (/\.on[A-Z]\w*$/.test(path) ? () => undefined : Promise.resolve(undefined))
  })
}
;(globalThis as any).window = { ide: bridge(""), matchMedia: () => ({ matches: true }) }
const { useChatStore } = await import("./chat-store.ts")
const { dispatchAgentEvent } = await import("./attention/dispatch-agent-event.ts")
const { touchSessionUpdatedAt } = await import("./touch-session-time.ts")
const { formatNodeTime } = await import("./chat-store.ts")
const { MINUTE_TICK_MS } = await import("../hooks/use-minute-tick.ts")

const HOUR = 3_600_000
function tree(now: number) {
  useChatStore.setState({
    sessionId: "ses_fg",
    running: false,
    runId: null,
    repositories: [
      { id: "ws", name: "ws", kind: "workspace", updatedAt: now - 5 * HOUR },
      { id: "ses_fg", name: "前台", kind: "session", parentId: "ws", updatedAt: now - 3 * HOUR },
      { id: "ses_bg", name: "后台", kind: "session", parentId: "ws", updatedAt: now - 2 * HOUR }
    ]
  } as never)
}
const at = (id: string) => useChatStore.getState().repositories.find((n) => n.id === id)!.updatedAt
const label = (id: string) => formatNodeTime(at(id), (p, v) => (v ? `${p}:${v.n}` : p))

test("后台会话 B 开跑 / 跑完：侧栏时间顶到现在（「刚刚」），别的会话不动", () => {
  const now = Date.now()
  tree(now)
  assert.notEqual(label("ses_bg"), "chat.timeJustNow")
  dispatchAgentEvent({ type: "run.start", runId: "run_b", sessionId: "ses_bg" } as never)
  assert.ok(at("ses_bg") >= now)
  assert.equal(label("ses_bg"), "chat.timeJustNow")
  assert.equal(at("ses_fg"), now - 3 * HOUR, "前台会话没被顶")
  assert.equal(at("ws"), now - 5 * HOUR, "工作区节点不动")
  useChatStore.setState({ repositories: useChatStore.getState().repositories.map((n) => (n.id === "ses_bg" ? { ...n, updatedAt: now - HOUR } : n)) } as never)
  dispatchAgentEvent({ type: "run.end", runId: "run_b", sessionId: "ses_bg" } as never)
  assert.equal(label("ses_bg"), "chat.timeJustNow", "一轮结束再顶一次")
})

test("出错结束（run.error）也顶；标题精炼之类的旁路 completion 不顶", () => {
  const now = Date.now()
  tree(now)
  dispatchAgentEvent({ type: "run.start", runId: "run_title", sessionId: "ses_fg", kind: "completion" } as never)
  assert.equal(at("ses_fg"), now - 3 * HOUR, "旁路不算")
  dispatchAgentEvent({ type: "run.error", runId: "run_e", sessionId: "ses_fg", message: "boom" } as never)
  assert.ok(at("ses_fg") >= now)
})

test("touchSessionUpdatedAt：只往后顶、不存在的会话不动、不改别的引用", () => {
  const now = Date.now()
  tree(now)
  const before = useChatStore.getState().repositories
  touchSessionUpdatedAt("ses_bg", now - 10 * HOUR)
  assert.equal(useChatStore.getState().repositories, before, "更早的时间不往回拨，也不换引用")
  touchSessionUpdatedAt("ses_missing", now)
  assert.equal(useChatStore.getState().repositories, before)
  touchSessionUpdatedAt("ws", now)
  assert.equal(useChatStore.getState().repositories, before, "工作区节点不当会话顶")
})

test("侧栏每 60 秒重画一次让相对时间往前走（源码正则）", () => {
  assert.equal(MINUTE_TICK_MS, 60_000)
  const col = readFileSync(new URL("../components/app-shell/chrome/context-column.tsx", import.meta.url), "utf8")
  assert.match(col, /useMinuteTick\(\)/)
})
