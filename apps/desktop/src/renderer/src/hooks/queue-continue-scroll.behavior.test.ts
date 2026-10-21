/**
 * luna #170 r-luna ②：排队区「继续」是用户点的——解除暂停后自启发出的第一条要贴底；没点继续、上一轮跑完后自启发出的仍不拽。
 * 真走 followup-queue 暂停 / actions.continueFollowups / tryStartNextFollowup（与 useFollowupAutostart 同一个 runQueuedAutoSend 包装），
 * 对话区那一侧用与 ai-chat-thread 的 useSendScrollTick 同一套 shouldScrollOnSend + takeSkipSendScroll 判断。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: () => {
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      if (path === ".session.drafts.loadSync" || path === ".session.drafts.loadAssetsSync") return {}
      return Promise.resolve(path.endsWith(".list") || path === ".session.messages" ? [] : undefined)
    }
  })
}
;(globalThis as any).window = { ide: bridge("") }

const { useChatStore } = await import("../stores/chat-store.ts")
const queue = await import("./followup-queue.ts")
const { tryStartNextFollowup, resetFollowupAutostart, drainFollowupAutostart } = await import("./followup-autostart.ts")
const actions = await import("./runtime-interact/followup-pause-actions.ts")
const scroll = await import("../components/ai-chat/thread/scroll-on-send.ts")

let seq = 0
/** 假发送：像真发送一样冒出一条新的用户消息、置上 running。 */
async function fakeSend(prompt: string) {
  seq += 1
  const state = useChatStore.getState()
  useChatStore.setState({ running: true, messages: [...state.messages, { id: `uq${seq}`, role: "user", content: prompt, createdAt: seq }] } as never)
}
function kick(): boolean {
  const store = useChatStore.getState()
  return tryStartNextFollowup({
    sessionId: store.sessionId,
    running: store.running,
    pendingApproval: Boolean(store.pendingApproval),
    send: (item) =>
      scroll.runQueuedAutoSend(item.sessionId, () => scroll.lastUserMessageId(useChatStore.getState().messages), () => fakeSend(item.prompt))
  })
}
const unsubscribe = queue.subscribeFollowups(() => void kick())

/** 对话区：和 useSendScrollTick 一样，每次最后一条用户消息变化时判一次要不要贴底。 */
const scrolls: boolean[] = []
let mark = { sessionId: null as string | null, lastUserId: null as string | null }
const unwatch = useChatStore.subscribe((state) => {
  const next = { sessionId: state.sessionId, lastUserId: scroll.lastUserMessageId(state.messages) }
  if (next.lastUserId !== mark.lastUserId || next.sessionId !== mark.sessionId) {
    if (scroll.lastUserChanged(mark, next)) scrolls.push(scroll.shouldScrollOnSend(mark, next, () => scroll.takeSkipSendScroll(next.sessionId)))
    mark = next
  }
})

const flush = async () => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0))
  await drainFollowupAutostart()
}

function idle(sessionId: string) {
  useChatStore.setState({
    workspaceId: "ws",
    sessionId,
    running: false,
    runId: null,
    error: null,
    pendingApproval: null,
    messages: [
      { id: "u1", role: "user", content: "先做这个", createdAt: 0 },
      { id: "a1", role: "assistant", content: "停了", createdAt: 0 }
    ]
  } as never)
}

afterEach(async () => {
  await drainFollowupAutostart()
  queue.resetFollowupsForTest()
  resetFollowupAutostart()
  scroll.resetSkipSendScrollForTest()
  scrolls.length = 0
})
test.after(() => {
  unsubscribe()
  unwatch()
})

test("停住后点「继续」：自启发出的第一条贴底；它跑完后自启发出的第二条不拽", async () => {
  idle("ses_c")
  // 跑着时排了两条，然后停住（空队列不记暂停，所以先排再停）。
  useChatStore.setState({ running: true } as never)
  queue.enqueueFollowup({ sessionId: "ses_c", prompt: "第一条", assets: [] })
  queue.enqueueFollowup({ sessionId: "ses_c", prompt: "第二条", assets: [] })
  assert.equal(queue.pauseFollowups("ses_c", "stopped"), true)
  useChatStore.setState({ running: false } as never)
  kick()
  await flush()
  assert.deepEqual(scrolls, [], "停着：一条都没发")
  actions.continueFollowups("ses_c")
  await flush()
  assert.deepEqual(scrolls, [true], "点了继续：第一条贴底")
  useChatStore.setState({ running: false } as never)
  kick()
  await flush()
  assert.deepEqual(scrolls, [true, false], "上一轮跑完后自启发出的不是用户刚点的：不拽")
})

test("对照：没停住、一轮跑完后排队自启发出 → 不贴底（host #170）", async () => {
  idle("ses_n")
  useChatStore.setState({ running: true } as never)
  queue.enqueueFollowup({ sessionId: "ses_n", prompt: "排着的", assets: [] })
  useChatStore.setState({ running: false } as never)
  kick()
  await flush()
  assert.deepEqual(scrolls, [false])
})

test("别的会话点的「继续」不让这个会话的自启贴底", async () => {
  idle("ses_a")
  scroll.markQueueResumedByUser("ses_other")
  queue.enqueueFollowup({ sessionId: "ses_a", prompt: "排着的", assets: [] })
  kick()
  await flush()
  assert.deepEqual(scrolls, [false])
})
