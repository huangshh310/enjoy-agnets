/**
 * leo #170 复审探针转正：真把 useSteeredHintExpiry 挂到 React 上跑（假时钟），锁住「连插两句『已收到』重新计时」的行为，
 * 不只靠源码正则。renderer 测试没有 jsdom：组件只返回 null，React 只需要一个能挂事件的假容器。
 */
import assert from "node:assert/strict"
import { mock, test } from "node:test"

mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1_000_000 })
const memory = new Map<string, string>()
const g = globalThis as any
g.localStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k)
}
// window.ide：store 引到的 IPC 桥一律回空（on* 订阅回退订函数）。
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: () =>
      /\.on[A-Z]\w*$/.test(path)
        ? () => undefined
        : path.endsWith("loadSync") || path.endsWith("loadAssetsSync")
          ? {}
          : Promise.resolve(undefined)
  })
}
const noop = () => undefined
const fakeDocument: any = { nodeType: 9, addEventListener: noop, removeEventListener: noop }
const container: any = { nodeType: 1, nodeName: "DIV", tagName: "DIV", namespaceURI: "http://www.w3.org/1999/xhtml", ownerDocument: fakeDocument, addEventListener: noop, removeEventListener: noop }
fakeDocument.documentElement = container
g.window = {
  ide: bridge(""),
  document: fakeDocument,
  setTimeout: (...a: any[]) => (setTimeout as any)(...a),
  clearTimeout: (h: any) => clearTimeout(h),
  addEventListener: noop,
  removeEventListener: noop,
  HTMLIFrameElement: class {},
  event: undefined
}
g.document = fakeDocument
g.IS_REACT_ACT_ENVIRONMENT = true

const React = await import("react")
const { createRoot } = await import("react-dom/client")
const { useChatStore } = await import("../../stores/chat-store.ts")
const q = await import("../followup-queue.ts")
const { useSteeredHintExpiry } = await import("./use-steered-hint-expiry.ts")
const { act, useEffect, useState } = React

/** 和 ComposerFollowupRail 一样：订阅本会话的提示，挂计时 hook。 */
function Rail() {
  const sessionId = useChatStore((s) => s.sessionId)
  const [hint, setHint] = useState(() => q.visibleRuntimeHint(sessionId))
  useEffect(() => {
    setHint(q.visibleRuntimeHint(sessionId))
    return q.subscribeFollowups(() => setHint(q.visibleRuntimeHint(sessionId)))
  }, [sessionId])
  useSteeredHintExpiry(hint)
  return null
}

let root: any
async function mount(sid = "s1", runId: string | null = "r1") {
  q.setRuntimeHint(null)
  useChatStore.setState({ sessionId: sid, messages: [{ id: "u0", role: "user", content: "hi", createdAt: 0 } as any], running: true, runId })
  root = createRoot(container)
  await act(async () => root.render(React.createElement(Rail)))
}
async function unmount() {
  await act(async () => root.unmount())
}
let n = 0
/** 跑着时 Ctrl+Enter 插一句：多一条用户消息 + 「已收到」。 */
async function steer() {
  await act(async () => {
    const s = useChatStore.getState()
    s.appendUserMessage(`steer ${(n += 1)}`)
    q.setRuntimeHint("steered", s.sessionId)
  })
}
async function tick(ms: number) {
  await act(async () => {
    mock.timers.tick(ms)
  })
}
const hint = () => q.getRuntimeHint()

test("同一轮第二次插话：「已收到」不被马上收掉，30 秒从第二句重新算", async () => {
  await mount()
  await steer()
  await tick(20_000)
  await steer()
  assert.equal(hint(), "steered", "第二句插进来时提示还在")
  await tick(20_000)
  assert.equal(hint(), "steered", "计时从第二句重新开始")
  await tick(10_001)
  assert.equal(hint(), null, "第二句后 30 秒收")
  await unmount()
})

test("连插三句：每句都重新计时", async () => {
  await mount()
  await steer()
  await tick(25_000)
  await steer()
  await tick(25_000)
  await steer()
  assert.equal(hint(), "steered")
  await tick(29_000)
  assert.equal(hint(), "steered")
  await tick(1_001)
  assert.equal(hint(), null)
  await unmount()
})

test("插话后这一轮结束：马上收", async () => {
  await mount()
  await steer()
  await act(async () => useChatStore.getState().setRunning(false))
  assert.equal(hint(), null)
  await unmount()
})

test("插话后又普通排队：提示换成「排队」，旧计时器到点不收它", async () => {
  await mount()
  await steer()
  await act(async () => q.setRuntimeHint("queued", "s1"))
  await tick(31_000)
  assert.equal(hint(), "queued")
  await unmount()
})

test("只插一句：30 秒到点收", async () => {
  await mount()
  await steer()
  await tick(29_999)
  assert.equal(hint(), "steered")
  await tick(2)
  assert.equal(hint(), null)
  await unmount()
})

test("卸载后计时器清掉：不会在卸载后再收提示、不抛错", async () => {
  await mount()
  await steer()
  await unmount()
  mock.timers.tick(31_000)
  assert.equal(hint(), "steered")
})

test("切走再切回：别的会话看不到；切回同一轮又插了一句 → 重新计时", async () => {
  await mount()
  await steer()
  await act(async () => useChatStore.setState({ sessionId: "s2", messages: [], running: true, runId: "r9" }))
  assert.equal(q.visibleRuntimeHint("s2"), null)
  await tick(31_000)
  assert.equal(hint(), "steered", "离开期间 s1 的提示留着（原有行为）")
  await act(async () =>
    useChatStore.setState({
      sessionId: "s1",
      messages: [{ id: "u0", role: "user", content: "hi", createdAt: 0 } as any, { id: "u1", role: "user", content: "x", createdAt: 0 } as any],
      running: true,
      runId: "r1"
    })
  )
  await tick(29_000)
  assert.equal(hint(), "steered")
  await tick(1_001)
  assert.equal(hint(), null)
  await unmount()
})

test("换了一轮（runId 变了）又发了一句：不算插话，马上收", async () => {
  await mount()
  await steer()
  await act(async () => {
    useChatStore.setState({ runId: "r2" })
    useChatStore.getState().appendUserMessage("next")
  })
  assert.equal(hint(), null)
  await unmount()
})

// leo #170 soft（后续，不在本 PR）：插话时 runId 还是 null、随后才拿到 runId，再插一句会被当成「换了一轮」收掉。
test.todo("runId 从 null 变成有值的窗口里第二次插话也应重新计时（leo soft，后续）")
