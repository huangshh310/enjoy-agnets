/**
 * leo #145 soft：迟到作废的发送只能放掉自己占的 running，不清后一发的。
 */
import assert from "node:assert/strict"
import { after, beforeEach, test } from "node:test"

const { useChatStore } = await import("../../stores/chat-store.ts")
const { claimComposerRunning, releaseComposerRunningIfOwner, resetComposerRunningOwnerForTest } = await import(
  "./composer-running-owner.ts"
)

beforeEach(() => {
  resetComposerRunningOwnerForTest()
  useChatStore.setState({ running: false, runId: null })
})

test("A 被看门狗作废后 B 接手 running；A 迟到放手不清 B 的 running", () => {
  const a = {}
  const b = {}
  claimComposerRunning(a)
  // 看门狗还稿：running 落下，用户又发 B
  useChatStore.getState().setRunning(false)
  claimComposerRunning(b)
  assert.equal(releaseComposerRunningIfOwner(a), false)
  assert.equal(useChatStore.getState().running, true)
  assert.equal(releaseComposerRunningIfOwner(b), true)
  assert.equal(useChatStore.getState().running, false)
})

test("没人接手：A 迟到放手照常落下 running", () => {
  const a = {}
  claimComposerRunning(a)
  assert.equal(releaseComposerRunningIfOwner(a), true)
  assert.equal(useChatStore.getState().running, false)
})


test("真发送链路：A（/compact 慢）被作废期间 B 接手，A 迟到返回不清 B 的 running", async () => {
  const b = {}
  const a = { text: "/compact 后续问题", launched: false, cancelled: false, done: false, paused: false }
  ;(globalThis as { window?: unknown }).window = {
    ide: {
      session: {
        compact: async () => {
          // 压缩期间：看门狗判 A 失败并落 running，用户接着发 B 占住 running。
          a.cancelled = true
          a.done = true
          useChatStore.getState().setRunning(false)
          claimComposerRunning(b)
          return { sessionId: "ses_own", summary: "", keptMessages: 0 }
        }
      }
    }
  }
  useChatStore.setState({
    workspaceId: "ws_own",
    sessionId: "ses_own",
    composer: "/compact 后续问题",
    messages: [{ id: "u0", role: "user", content: "hi", createdAt: 1 }],
    hasKey: true,
    error: null
  } as never)
  const { sendComposerMessage } = await import("./send-composer-run.ts")
  await sendComposerMessage(undefined, "/compact 后续问题", a)
  assert.equal(useChatStore.getState().running, true)
})

after(async () => {
  // /compact 写了 queryClient 缓存：清掉 gc 定时器，免得测试进程挂住。
  const { queryClient } = await import("../../lib/query-client.ts")
  queryClient.clear()
})
