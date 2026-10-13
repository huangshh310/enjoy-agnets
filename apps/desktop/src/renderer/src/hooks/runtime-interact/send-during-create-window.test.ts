/**
 * jojo P1：新对话「正在准备…」时发 A，0.5s 后再发 B。
 * A 入队即清输入框；B 不并进 A、不自动续发，留在输入框并提示「上一条还在准备」。
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

afterEach(() => {
  cancelQueuedComposerSend()
  resetNewSessionCreateForTest()
  resetQueuedComposerSendForTest()
  resetComposerRunningOwnerForTest()
})

function attempt(text: string) {
  return { text, launched: false, cancelled: false, done: false, paused: false }
}

test("建会话窗：A 入队清输入框；B 再按 Enter 不并进 A，留稿并提示上一条还在准备", async () => {
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
  await sendComposerMessage(undefined, "第二句B")
  const state = useChatStore.getState()
  assert.equal(state.composer, "第二句B", "只有 B 留在输入框，不与 A 合并")
  assert.equal(state.error, PREVIOUS_STILL_PREPARING)
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
    const { token } = beginNewSessionCreate()
    void sendComposerMessage(undefined, a, attempt(a) as never)
    assert.equal(useChatStore.getState().composer, "")
    useChatStore.getState().setComposer(b)
    await sendComposerMessage(undefined, b)
    assert.equal(useChatStore.getState().error, PREVIOUS_STILL_PREPARING)
    useChatStore.setState({ sessionId: "ses_m1" } as never)
    finishNewSessionCreate(token, "ses_m1")
    await flush()
    assert.ok(useChatStore.getState().messages.some((m) => m.role === "user"), "A 已乐观上屏（走到发出）")
    assert.equal(useChatStore.getState().composer, b, "B 原样留在输入框")
  })
}

test("leo M2：B 被拒（上一条还在准备）后 A 卡住，3s 内看门狗还回 A 并放掉 running", async () => {
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
  const sendingA = sendComposerMessage(undefined, "第一句A")
  useChatStore.getState().setComposer("第二句B")
  await sendComposerMessage(undefined, "第二句B")
  assert.equal(useChatStore.getState().error, PREVIOUS_STILL_PREPARING)
  // A 建会话完成后卡在等 running 落下（running 被占、没有 runId），迟迟发不出去。
  useChatStore.setState({ sessionId: "ses_m2", running: true, runId: null } as never)
  finishNewSessionCreate(token, "ses_m2")
  await new Promise((r) => setTimeout(r, 3_600))
  const state = useChatStore.getState()
  assert.match(state.composer, /第一句A/, "A 的原文还回输入框")
  assert.match(state.composer, /第二句B/, "B 也还在")
  assert.equal(state.running, false, "running 已放掉")
  // soft 2：两条拼在一起放回，提示说清。
  assert.equal(state.error, SEND_FAILED_RESTORE_MERGED)
  await sendingA
})
