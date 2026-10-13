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


type Attempt = { text: string; launched: boolean; cancelled: boolean; done: boolean; paused: boolean }

function attemptFor(text: string): Attempt {
  return { text, launched: false, cancelled: false, done: false, paused: false }
}

/**
 * A 在 /compact 里等；期间看门狗判 A 失败（cancelled、落 running），用户真发第二条 B（也走 /compact，挂住不返回），
 * B 占住 running 后 A 才回来。`aOutcome` 决定 A 的压缩怎么回来。
 */
async function raceLateA(aOutcome: "ok" | "throw"): Promise<void> {
  const a = attemptFor("/compact 第一句")
  const b = attemptFor("/compact 第二句")
  const { sendComposerMessage } = await import("./send-composer-run.ts")
  let calls = 0
  ;(globalThis as { window?: unknown }).window = {
    ide: {
      session: {
        compact: async () => {
          calls += 1
          if (calls > 1) return new Promise(() => {}) // B：一直在压缩，running 归 B
          a.cancelled = true
          a.done = true
          useChatStore.getState().setRunning(false)
          useChatStore.getState().setComposer("/compact 第二句")
          void sendComposerMessage(undefined, "/compact 第二句", b)
          for (let i = 0; i < 20 && calls < 2; i += 1) await new Promise((r) => setTimeout(r, 0))
          assert.equal(calls, 2, "B 已进入压缩、占住 running")
          assert.equal(useChatStore.getState().running, true)
          if (aOutcome === "throw") {
            // 让 A 的取稿真的抛出（compactSessionOrReport 的 catch 里 setError 抛），走 send-composer-run 的 catch。
            const setError = useChatStore.getState().setError
            useChatStore.setState({
              setError: (() => {
                useChatStore.setState({ setError })
                throw new Error("late boom")
              }) as never
            })
            throw new Error("compact failed")
          }
          return { sessionId: "ses_own", summary: "", keptMessages: 0 }
        }
      }
    }
  }
  useChatStore.setState({
    workspaceId: "ws_own",
    sessionId: "ses_own",
    composer: "/compact 第一句",
    messages: [{ id: "u0", role: "user", content: "hi", createdAt: 1 }],
    hasKey: true,
    error: null
  } as never)
  await sendComposerMessage(undefined, "/compact 第一句", a)
}

test("真发送链路：A 迟到正常返回，不清真实第二发 B 的 running", async () => {
  await raceLateA("ok")
  assert.equal(useChatStore.getState().running, true)
})

test("真发送链路：A 作废后取稿抛错，不清 B 的 running、不把 A 的字还回输入框", async () => {
  await raceLateA("throw")
  assert.equal(useChatStore.getState().running, true)
  assert.doesNotMatch(useChatStore.getState().composer, /第一句/)
})

after(async () => {
  // /compact 写了 queryClient 缓存：清掉 gc 定时器，免得测试进程挂住。
  const { queryClient } = await import("../../lib/query-client.ts")
  queryClient.clear()
})
