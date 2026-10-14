/**
 * jojo P1：新对话「正在准备…」时发 A，0.5s 后再发 B。
 * A 入队即清输入框；B（#155 gate2 jojo P1）按下即快照正文 + 附件、清输入框，排在 A 后面：
 * A 开跑后 B 进运行中排队，A 跑完自动发 B。B 的图绝不并进 A。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

const { useChatStore } = await import("../../stores/chat-store.ts")
const { sendComposerMessage } = await import("./send-composer-run.ts")
const { PREVIOUS_STILL_PREPARING } = await import("../queue-composer-send-copy.ts")
const { cancelQueuedComposerSend, hasQueuedComposerSend, resetQueuedComposerSendForTest } = await import(
  "../queue-composer-send.ts"
)
const { beginNewSessionCreate, finishNewSessionCreate, resetNewSessionCreateForTest } = await import(
  "../new-session-create.ts"
)
const { resetComposerRunningOwnerForTest } = await import("./composer-running-owner.ts")
const { isComposerWritebackHeld } = await import("../composer-sync-lock.ts")
const { readPersistedDraft, writePersistedDraft } = await import("../../lib/session-draft-storage.ts")
const { listFollowups, takeNextFollowup } = await import("../followup-queue.ts")
const { setComposerAssets, clearComposerAssets, listComposerAssets } = await import("../composer-assets.ts")

function drainFollowups(sessionId: string) {
  while (takeNextFollowup(sessionId)) {}
}

// 草稿落盘用：内存版 localStorage。
const memory = new Map<string, string>()
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k)
}

afterEach(() => {
  cancelQueuedComposerSend()
  resetNewSessionCreateForTest()
  resetQueuedComposerSendForTest()
  resetComposerRunningOwnerForTest()
})

function attempt(text: string) {
  return { text, launched: false, cancelled: false, done: false, paused: false }
}

test("建会话窗：A 入队清输入框；B 再按 Enter 快照正文 + 图、清输入框，不并进 A", async () => {
  clearComposerAssets()
  useChatStore.setState({
    sessionId: null,
    running: false,
    preparingHint: true,
    composer: "第一句A",
    error: null,
    messages: []
  } as never)
  beginNewSessionCreate()
  const sendingA = sendComposerMessage(undefined, "第一句A", attempt("第一句A") as never)
  assert.equal(hasQueuedComposerSend(), true)
  assert.equal(useChatStore.getState().composer, "", "A 入队即清输入框")

  useChatStore.getState().setComposer("第二句B")
  setComposerAssets([{ id: "ast_b", name: "b.png", mediaType: "image/png", url: "blob:b" }] as never)
  void sendComposerMessage(undefined, "第二句B")
  await Promise.resolve()
  const state = useChatStore.getState()
  assert.equal(state.composer, "", "B 已取走，不留在输入框")
  assert.equal(listComposerAssets().length, 0, "B 的图随 B 取走")
  assert.notEqual(state.error, PREVIOUS_STILL_PREPARING)
  assert.equal(hasQueuedComposerSend(), true, "队列仍是 A，B 没顶替进去")

  cancelQueuedComposerSend()
  resetNewSessionCreateForTest()
  await sendingA
})

/** 任意 window.ide.* 调用都挂住不返回：发送停在「已发出、等 run」那一刻。 */
function hangingIde(): unknown {
  const fn: unknown = new Proxy(() => new Promise(() => {}), {
    get: (_t, key) => (key === "then" ? undefined : fn)
  })
  return fn
}

async function flush(): Promise<void> {
  for (let i = 0; i < 30; i += 1) await new Promise((r) => setTimeout(r, 0))
}

for (const [label, a, b] of [
  ["B 以 A 开头", "修登录页", "修登录页，顺便改按钮"],
  ["B 与 A 相同", "修登录页", "修登录页"]
] as const) {
  test(`leo M1：A 排队发出后不动输入框里的 B（${label}）`, async () => {
    ;(globalThis as { window?: unknown }).window = { ide: hangingIde() }
    useChatStore.setState({
      workspaceId: "ws_m1",
      sessionId: null,
      running: false,
      preparingHint: true,
      composer: a,
      error: null,
      hasKey: true,
      modelId: "stub-e2e",
      messages: []
    } as never)
    drainFollowups("ses_m1")
    const { token } = beginNewSessionCreate()
    const sendingA = sendComposerMessage(undefined, a, attempt(a) as never)
    assert.equal(useChatStore.getState().composer, "")
    useChatStore.getState().setComposer(b)
    void sendComposerMessage(undefined, b)
    useChatStore.setState({ sessionId: "ses_m1" } as never)
    finishNewSessionCreate(token, "ses_m1")
    await flush()
    assert.ok(useChatStore.getState().messages.some((m) => m.role === "user"), "A 已乐观上屏（走到发出）")
    // A 的发送（真 IPC 挂住）还没结束：B 还在排 A 后面，没提前进运行中队列、也没回输入框。
    assert.equal(useChatStore.getState().composer, "", "B 不回输入框")
    assert.equal(listFollowups("ses_m1").length, 0, "A 没发出去前 B 不抢跑")
    void sendingA
    // leo soft：入队时上的写回锁，A 发出后必须放掉（否则之后 store→输入框永远不同步）。
    assert.equal(isComposerWritebackHeld(), false, "写回锁已放")
  })
}

test("leo M2：B 排在 A 后面、A 卡住，3s 内看门狗还回 A 并放掉 running；B 不丢，进运行中排队", async () => {
  ;(globalThis as { window?: unknown }).window = { ide: hangingIde() }
  const { SEND_FAILED_RESTORE_MERGED } = await import("../queue-composer-send-copy.ts")
  useChatStore.setState({
    workspaceId: "ws_m2",
    sessionId: null,
    running: false,
    runId: null,
    preparingHint: true,
    composer: "第一句A",
    error: null,
    hasKey: true,
    modelId: "stub-e2e",
    messages: []
  } as never)
  const { token } = beginNewSessionCreate()
  // 真实看门狗：不传 queuedAttempt。
  drainFollowups("ses_m2")
  const sendingA = sendComposerMessage(undefined, "第一句A")
  useChatStore.getState().setComposer("第二句B")
  const sendingB = sendComposerMessage(undefined, "第二句B")
  // A 建会话完成后卡在等 running 落下（running 被占、没有 runId），迟迟发不出去。
  useChatStore.setState({ sessionId: "ses_m2", running: true, runId: null } as never)
  finishNewSessionCreate(token, "ses_m2")
  await new Promise((r) => setTimeout(r, 3_600))
  const state = useChatStore.getState()
  assert.match(state.composer, /第一句A/, "A 的原文还回输入框")
  assert.doesNotMatch(state.composer, /第二句B/, "B 不和 A 拼在一起")
  assert.equal(state.running, false, "running 已放掉")
  assert.notEqual(state.error, SEND_FAILED_RESTORE_MERGED)
  await sendingA
  await sendingB
  assert.deepEqual(listFollowups("ses_m2").map((f) => f.prompt), ["第二句B"], "B 进了运行中排队")
})

test("leo soft：A 发出时框里没有后打的字——这个会话的草稿（内存 + 落盘）不再留着 A", async () => {
  ;(globalThis as { window?: unknown }).window = { ide: hangingIde() }
  useChatStore.setState({
    workspaceId: "ws_dr",
    sessionId: null,
    running: false,
    preparingHint: true,
    composer: "只发A",
    error: null,
    hasKey: true,
    modelId: "stub-e2e",
    messages: [],
    sessionDrafts: {}
  } as never)
  const { token } = beginNewSessionCreate()
  void sendComposerMessage(undefined, "只发A", attempt("只发A") as never)
  useChatStore.setState({ sessionId: "ses_dr" } as never)
  // 创建窗里切走又切回之类：A 被存成了这个会话的草稿。
  useChatStore.getState().saveSessionDraft("ses_dr", { text: "只发A" })
  writePersistedDraft("ses_dr", "只发A")
  finishNewSessionCreate(token, "ses_dr")
  await flush()
  assert.equal(useChatStore.getState().composer, "")
  assert.equal(useChatStore.getState().getSessionDraft("ses_dr"), undefined)
  assert.equal(readPersistedDraft("ses_dr"), undefined)
})

test("leo 反向：A 发出途中切到别的会话——清的是 A 的会话草稿，别的会话的稿不动", async () => {
  ;(globalThis as { window?: unknown }).window = { ide: hangingIde() }
  useChatStore.setState({
    workspaceId: "ws_sw",
    sessionId: null,
    running: false,
    preparingHint: true,
    composer: "只发A",
    error: null,
    hasKey: true,
    modelId: "stub-e2e",
    messages: [],
    sessionDrafts: {}
  } as never)
  const { token } = beginNewSessionCreate()
  void sendComposerMessage(undefined, "只发A", attempt("只发A") as never)
  useChatStore.getState().saveSessionDraft("ses_sw_a", { text: "只发A" })
  writePersistedDraft("ses_sw_a", "只发A")
  useChatStore.getState().saveSessionDraft("ses_sw_other", { text: "别的会话没发的稿" })
  writePersistedDraft("ses_sw_other", "别的会话没发的稿")
  useChatStore.setState({ sessionId: "ses_sw_a" } as never)
  // 发送已过会话校验、占上 running 之后（取稿那一拍），用户切到了另一个会话。
  let switched = false
  const unsubscribe = useChatStore.subscribe((state, prev) => {
    if (switched || !state.running || prev.running) return
    switched = true
    queueMicrotask(() => useChatStore.setState({ sessionId: "ses_sw_other", composer: "" } as never))
  })
  finishNewSessionCreate(token, "ses_sw_a")
  await flush()
  unsubscribe()
  assert.equal(switched, true)
  assert.ok(useChatStore.getState().messages.some((m) => m.role === "user"), "A 已走到发出")
  assert.equal(useChatStore.getState().getSessionDraft("ses_sw_other")?.text, "别的会话没发的稿")
  assert.equal(readPersistedDraft("ses_sw_other"), "别的会话没发的稿")
  assert.equal(useChatStore.getState().getSessionDraft("ses_sw_a"), undefined)
  assert.equal(readPersistedDraft("ses_sw_a"), undefined)
})

test("leo soft：A 发出后留的 B 以输入框 DOM 为准（写回锁期间 store 可能落后）", async () => {
  ;(globalThis as { window?: unknown }).window = { ide: hangingIde() }
  const el = { value: "", getAttribute: () => "composer-input", focus() {} }
  ;(globalThis as { document?: unknown }).document = {
    activeElement: null,
    querySelector: () => el
  }
  try {
    useChatStore.setState({
      workspaceId: "ws_dom",
      sessionId: null,
      running: false,
      preparingHint: true,
      composer: "A句",
      error: null,
      hasKey: true,
      modelId: "stub-e2e",
      messages: []
    } as never)
    el.value = "A句"
    const { token } = beginNewSessionCreate()
    void sendComposerMessage(undefined, "A句", attempt("A句") as never)
    // 用户在框里打了 B，store 还落后几个字。
    el.value = "B 句完整"
    useChatStore.setState({ composer: "B 句", sessionId: "ses_dom" } as never)
    finishNewSessionCreate(token, "ses_dom")
    await flush()
    assert.equal(useChatStore.getState().composer, "B 句完整")
  } finally {
    delete (globalThis as { document?: unknown }).document
  }
})

test("leo soft：A 自己的「没发出去」让看门狗收手（真实 armComposerWatchdog，不注入 noticeShown）", async () => {
  ;(globalThis as { window?: unknown }).window = { ide: hangingIde() }
  const { SEND_FAILED_RESTORE } = await import("../queue-composer-send-copy.ts")
  useChatStore.setState({
    workspaceId: "ws_own",
    sessionId: null,
    running: false,
    runId: null,
    preparingHint: true,
    composer: "自己失败的A",
    error: null,
    hasKey: true,
    modelId: "stub-e2e",
    messages: []
  } as never)
  const { token } = beginNewSessionCreate()
  const sendingA = sendComposerMessage(undefined, "自己失败的A")
  // A 卡在等 running；期间 A 自己的失败路径已出「没发出去」并把字还了回去（这里用户又删掉了）。
  useChatStore.setState({ sessionId: "ses_own2", running: true, runId: null } as never)
  finishNewSessionCreate(token, "ses_own2")
  useChatStore.getState().setError(SEND_FAILED_RESTORE)
  useChatStore.getState().setComposer("")
  await new Promise((r) => setTimeout(r, 3_600))
  // 看门狗若没收手，3s 时会再还一次 A。
  assert.equal(useChatStore.getState().composer, "", "看门狗没有再还一次 A")
  // 最后一个用例：A 仍挂着等 running，不再放开。
  void sendingA
})

test("jojo 红卡：新对话「正在准备…」里再按 Enter（排队首发）就收掉上一发的红卡，不与思考中同屏", async () => {
  const { SEND_FAILED_RESTORE_MERGED } = await import("../queue-composer-send-copy.ts")
  useChatStore.setState({
    sessionId: null,
    running: false,
    preparingHint: true,
    composer: "后打的B\n先发的A",
    error: SEND_FAILED_RESTORE_MERGED,
    messages: []
  } as never)
  beginNewSessionCreate()
  const sending = sendComposerMessage(undefined, "后打的B\n先发的A", attempt("后打的B\n先发的A") as never)
  assert.equal(hasQueuedComposerSend(), true)
  assert.equal(useChatStore.getState().error, null, "红卡已收")
  cancelQueuedComposerSend()
  resetNewSessionCreateForTest()
  await sending
})
