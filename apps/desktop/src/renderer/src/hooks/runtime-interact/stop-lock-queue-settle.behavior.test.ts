/**
 * E1 / jojo F2：收尾期间点了暂停行「继续」（或期间又排了几条）——落定后不能显示「排队中 / 下一句」却永远不发。
 * 选定修法：落定时把这个会话的队列按「你停止了上一轮」停住（与刷新后的暂停态同一份 reason / 文案），不自动发；
 * 用户再点「继续」照常按顺序发出。别的会话的队列不动；已经停着的（held / 出错…）不改原因。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { afterEach, test } from "node:test"

const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
const calls: Array<{ path: string; arg: any }> = []
let runSeq = 0
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, args) => {
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      calls.push({ path, arg: args[0] })
      if (path === ".agent.run") return Promise.resolve({ ok: true, runId: `run_f2_${++runSeq}` })
      if (path === ".session.drafts.loadSync" || path === ".session.drafts.loadAssetsSync") return {}
      return Promise.resolve(path.endsWith(".list") || path === ".session.messages" ? [] : undefined)
    }
  })
}
// 自启走真实的 useFollowupAutostart（挂到 React 上）：renderer 测试没有 jsdom，hook 组件只返回 null，React 只需要一个能挂事件的假容器。
const noop = () => undefined
const fakeDocument: any = { nodeType: 9, addEventListener: noop, removeEventListener: noop, querySelector: () => null, querySelectorAll: () => [] }
const container: any = { nodeType: 1, nodeName: "DIV", tagName: "DIV", namespaceURI: "http://www.w3.org/1999/xhtml", ownerDocument: fakeDocument, addEventListener: noop, removeEventListener: noop }
fakeDocument.documentElement = container
;(globalThis as any).window = {
  ide: bridge(""),
  document: fakeDocument,
  setTimeout: (...a: any[]) => (setTimeout as any)(...a),
  clearTimeout: (h: any) => clearTimeout(h),
  addEventListener: noop,
  removeEventListener: noop,
  HTMLIFrameElement: class {},
  event: undefined
}
;(globalThis as any).document = fakeDocument
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

const { useChatStore } = await import("../../stores/chat-store.ts")
const S = await import("../../stores/stop-settle.ts")
const queue = await import("../followup-queue.ts")
const { continueFollowups } = await import("./followup-pause-actions.ts")
const { resetFollowupAutostart, drainFollowupAutostart } = await import("../followup-autostart.ts")
const { useFollowupAutostart } = await import("../use-followup-autostart.ts")
const React = await import("react")
const { createRoot } = await import("react-dom/client")
const { act } = React
const { resetClientRequestIdForTest } = await import("./client-request-id.ts")
const { resetComposerRunningOwnerForTest } = await import("./composer-running-owner.ts")
const { resetStoppedRunsForTest } = await import("../stopped-runs.ts")

const flush = async () => { for (let i = 0; i < 40; i++) await new Promise((r) => setTimeout(r, 0)) }
const agentRuns = () => calls.filter((c) => c.path === ".agent.run")

/** 真实自启：挂上 useFollowupAutostart（和 AiChatComposer 一样），队列一变它自己 kick。 */
function Autostart() {
  useFollowupAutostart()
  return null
}
let root: any = null
async function mountAutostart() {
  root = createRoot(container)
  await act(async () => root.render(React.createElement(Autostart)))
}
/** 在 act 里改 store / 队列，让 hook 的订阅与 effect 跑完。 */
async function step(fn: () => unknown) {
  await act(async () => {
    fn()
  })
  await flush()
}

afterEach(async () => {
  if (root) await act(async () => root.unmount())
  root = null
  calls.length = 0
  S.resetStopSettleForTest()
  queue.resetFollowupsForTest()
  resetFollowupAutostart()
  resetClientRequestIdForTest()
  resetComposerRunningOwnerForTest()
  resetStoppedRunsForTest()
})

let seq = 0
function stuckSession() {
  seq += 1
  const sessionId = `ses_f2_${seq}`
  useChatStore.setState({
    workspaceId: "ws", sessionId, running: false, runId: null, composer: "", error: null, notice: null,
    pendingApproval: null, hasKey: true, modelId: "stub-e2e", runtimeId: "enjoy-local", pendingStreamEvents: [],
    preparingHint: false, preparingSessionId: null,
    repositories: [{ id: sessionId, workflowStatus: "todo" }],
    messages: [{ id: "u0", role: "user", content: "写个文件", createdAt: 1 }, { id: "a0", role: "assistant", content: "", createdAt: 2 }]
  } as never)
  const clock = 1_000
  S.resetStopSettleForTest(() => clock)
  S.beginStopSettle(sessionId, `run_old_${seq}`, ["t1"])
  S.noteStopSettleEvent({ type: "run.error", runId: `run_old_${seq}`, sessionId, error: "aborted", settling: { deadlineAt: clock + 60_000, stopRequestedAt: clock } } as never)
  S.noteStopSettleEvent({ type: "run.stopped", runId: `run_old_${seq}`, sessionId, phase: "stuck", receipt: { write: "maybe_partial", tools: [] } } as never)
  assert.equal(S.isStopLocked(sessionId), true)
  return sessionId
}
function settle(sessionId: string) {
  S.noteStopSettleEvent({ type: "run.stopped", runId: `run_old_${seq}`, sessionId, phase: "final", receipt: { write: "maybe_partial", tools: [] } } as never)
  assert.equal(S.isStopLocked(sessionId), false, "前提：已落定")
}
test("F2 ①：卡住时点了暂停行「继续」——落定后队列回到「你停止了上一轮」暂停态（与刷新后同一 reason），不自动发、内容都在", async () => {
  const sid = stuckSession()
  await mountAutostart()
  await step(() => {
    queue.enqueueFollowup({ sessionId: sid, prompt: "排队甲", assets: [] })
    queue.enqueueFollowup({ sessionId: sid, prompt: "排队乙", assets: [] })
    queue.pauseFollowups(sid, "stopped")
  })
  await step(() => continueFollowups(sid))
  assert.equal(queue.followupPausedReason(sid), null, "前提：卡住时「继续」解除了暂停")
  // 真实自启在「继续」时被 notify 踢了一次：锁住，不取项、不发
  await drainFollowupAutostart()
  assert.deepEqual(queue.listFollowups(sid).map((f) => f.prompt), ["排队甲", "排队乙"], "锁住：自启没取走任何一条")
  assert.equal(agentRuns().length, 0, "锁住：自启没发")
  await step(() => settle(sid))
  assert.equal(queue.followupPausedReason(sid), "stopped", "落定：回到可见暂停态")
  await drainFollowupAutostart()
  await flush()
  assert.equal(agentRuns().length, 0, "没自动发")
  assert.deepEqual(queue.listFollowups(sid).map((f) => f.prompt), ["排队甲", "排队乙"], "内容都在")
})

test("F2 ②：卡住期间新排的（没停着）落定后同样停住，不挂在「排队中」", async () => {
  const sid = stuckSession()
  await mountAutostart()
  await step(() => queue.enqueueFollowup({ sessionId: sid, prompt: "卡住时排的", assets: [] }))
  assert.equal(queue.followupPausedReason(sid), null)
  await step(() => settle(sid))
  assert.equal(queue.followupPausedReason(sid), "stopped")
  await drainFollowupAutostart()
  await flush()
  assert.equal(agentRuns().length, 0)
  assert.deepEqual(queue.listFollowups(sid).map((f) => f.prompt), ["卡住时排的"])
})

test("F2 ③：落定后点「继续」照常按顺序发出第一条", async () => {
  const sid = stuckSession()
  await mountAutostart()
  await step(() => {
    queue.enqueueFollowup({ sessionId: sid, prompt: "排队甲", assets: [] })
    queue.enqueueFollowup({ sessionId: sid, prompt: "排队乙", assets: [] })
  })
  await step(() => continueFollowups(sid))
  await step(() => settle(sid))
  assert.equal(agentRuns().length, 0, "前提：落定前后都没自动发")
  // 落定后点「继续」：真实自启被 notify 踢起来，按顺序发第一条
  await step(() => continueFollowups(sid))
  assert.equal(queue.followupPausedReason(sid), null)
  await drainFollowupAutostart()
  await flush()
  assert.equal(agentRuns().length, 1, "继续后发出去了")
  assert.equal(agentRuns()[0].arg.sessionId, sid)
  assert.deepEqual(queue.listFollowups(sid).map((f) => f.prompt), ["排队乙"], "按顺序，第二条还在队里")
})

test("F2：已经停着的不改原因（出错仍是出错）；空队列不记暂停", () => {
  const sid = stuckSession()
  settle(sid)
  assert.equal(queue.followupPausedReason(sid), null, "空队列落定不记暂停")
  const sid2 = stuckSession()
  queue.enqueueFollowup({ sessionId: sid2, prompt: "x", assets: [] })
  queue.pauseFollowups(sid2, "error")
  settle(sid2)
  assert.equal(queue.followupPausedReason(sid2), "error", "原因不被改写")
})

test("F2：别的会话的队列不动——A 落定时 B 的排队照旧不停", () => {
  const a = stuckSession()
  const b = `ses_f2_other_${seq}`
  queue.enqueueFollowup({ sessionId: b, prompt: "B 的一句", assets: [] })
  settle(a)
  assert.equal(queue.followupPausedReason(b), null)
})

test("F2：暂停行文案复用现有「你停止了上一轮」（reason=stopped），没有新造文案", () => {
  const src = readFileSync(new URL("../../stores/stop-settle.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n")
  assert.match(src, /pauseFollowups\(sessionId, "stopped"\)/)
  assert.doesNotMatch(src, /\bt\(|i18n/, "stop-settle 不碰文案")
})
