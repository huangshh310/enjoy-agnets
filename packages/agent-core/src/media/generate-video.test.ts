import assert from "node:assert/strict"
import { test } from "node:test"
import {
  explainVideoError,
  videoBytesFromResult,
  videoGenerationPrompt,
  videoTimeoutMs,
  VIDEO_POLL_TIMEOUT_MS
} from "./generate-video.ts"

test("有参考图时 prompt 走 image+text 对象", () => {
  const image = new Uint8Array([1, 2, 3])
  assert.deepEqual(videoGenerationPrompt("  walk  ", image), { text: "walk", image })
  assert.equal(videoGenerationPrompt("a cat", undefined), "a cat")
})

test("用户超时短于轮询窗口时抬到 10 分钟", () => {
  assert.equal(videoTimeoutMs(0), undefined)
  assert.equal(videoTimeoutMs(undefined), undefined)
  assert.equal(videoTimeoutMs(30_000), VIDEO_POLL_TIMEOUT_MS)
  assert.equal(videoTimeoutMs(900_000), 900_000)
})

test("优先 uint8Array，否则下 ephemeral URL", async () => {
  const fromFile = await videoBytesFromResult({
    video: { uint8Array: new Uint8Array([9, 8]) }
  })
  assert.deepEqual([...fromFile], [9, 8])

  const fromUrl = await videoBytesFromResult(
    { providerMetadata: { xai: { videoUrl: "https://vidgen.example/a.mp4" } } },
    async (url) => {
      assert.equal(url, "https://vidgen.example/a.mp4")
      return new Uint8Array([7])
    }
  )
  assert.deepEqual([...fromUrl], [7])
})

test("既无字节也无 URL 时抛错", async () => {
  await assert.rejects(() => videoBytesFromResult({}), /no bytes/)
})

test("连接超时改成可读原因，不倒 IP 列表", () => {
  const explained = explainVideoError(
    new Error("Failed after 3 attempts. Last error: AI_APICallError: Cannot connect to API: Connect Timeout Error")
  )
  assert.match(explained.message, /same Base URL/)
  assert.doesNotMatch(explained.message, /attempted addresses/)
})
