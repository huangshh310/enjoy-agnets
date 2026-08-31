import assert from "node:assert/strict"
import { test } from "node:test"
import { staticCapabilitiesFor, unsupportedReason } from "./catalog.ts"

test("语言模型默认具备 text/tools/structured", () => {
  const caps = staticCapabilitiesFor("deepseek-chat", "deepseek")
  assert.ok(caps.includes("text"))
  assert.ok(caps.includes("tools"))
  assert.ok(caps.includes("structured"))
})

test("vision 模型带 vision 能力", () => {
  const caps = staticCapabilitiesFor("gpt-4o", "openai")
  assert.ok(caps.includes("vision"))
  assert.ok(caps.includes("image"))
})

test("不支持能力给出可读原因", () => {
  const reason = unsupportedReason("video", "deepseek-chat")
  assert.match(reason, /video/i)
})

test("媒体官方 kind 只声明对应能力", () => {
  const fal = staticCapabilitiesFor("fal-ai/flux/schnell", "fal")
  assert.deepEqual(fal, ["image", "video"])
  assert.deepEqual(staticCapabilitiesFor("eleven_multilingual_v2", "elevenlabs"), ["speech"])
  assert.ok(staticCapabilitiesFor("embed-english-v3.0", "cohere").includes("rerank"))
})
