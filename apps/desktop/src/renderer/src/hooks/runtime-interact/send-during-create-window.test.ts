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
const { beginNewSessionCreate, resetNewSessionCreateForTest } = await import("../new-session-create.ts")
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
