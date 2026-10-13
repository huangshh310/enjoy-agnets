/**
 * leo #145 M1：看门狗已还稿出提示后，迟到返回的取稿（如 /compact 压缩 >3s）不得再清输入框、取走附件。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { SendAttempt } from "./send-watchdog.ts"

const { useChatStore } = await import("../../stores/chat-store.ts")
const { listComposerAssets, setComposerAssets } = await import("../composer-assets.ts")
const { resolveSendPayload } = await import("./resolve-send-payload.ts")

test("看门狗作废后迟到的取稿：返回 cancelled，输入框与附件原样保留", async () => {
  const text = "/compact 后续问题"
  useChatStore.setState({ sessionId: "ses_late", composer: text })
  setComposerAssets([{ id: "asset_1", name: "a.png", mediaType: "image/png" } as never])
  const attempt: SendAttempt = { text, launched: false, cancelled: false, done: false, paused: false }
  // 慢取稿：等待期间看门狗判失败（还稿 + 提示），然后才返回正文。
  const slowTake = async () => {
    await new Promise((resolve) => setTimeout(resolve, 5))
    attempt.cancelled = true
    attempt.done = true
    return "后续问题"
  }
  const result = await resolveSendPayload(undefined, { text } as never, attempt, slowTake)
  assert.equal(result, "cancelled")
  assert.equal(useChatStore.getState().composer, text)
  assert.deepEqual(listComposerAssets().map((item) => item.id), ["asset_1"])
})

test("未作废的正常取稿：照常清稿、带走附件", async () => {
  useChatStore.setState({ sessionId: "ses_ok", composer: "hello" })
  setComposerAssets([{ id: "asset_2", name: "b.png", mediaType: "image/png" } as never])
  const result = await resolveSendPayload(undefined, { text: "hello" } as never, undefined, async () => "hello")
  assert.ok(result && result !== "cancelled")
  assert.deepEqual(result.assetIds, ["asset_2"])
  assert.equal(useChatStore.getState().composer, "")
})
