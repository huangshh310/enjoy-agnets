import assert from "node:assert/strict"
import { test } from "node:test"
import { videoFactoryKind, xaiVideoBaseURL } from "./video-factory-kind.ts"

test("Fal / Replicate 走官方视频工厂", () => {
  assert.equal(videoFactoryKind({ provider: "fal", modelId: "luma-dream-machine/ray-2" }), "fal")
  assert.equal(videoFactoryKind({ provider: "replicate", modelId: "minimax/video-01" }), "replicate")
})

test("grok-imagine-video 即使挂在 OpenAI 兼容档案也走 xAI", () => {
  assert.equal(videoFactoryKind({ provider: "openai", modelId: "grok-imagine-video" }), "xai")
  assert.equal(videoFactoryKind({ provider: "custom", modelId: "grok-imagine-video-1.5" }), "xai")
})

test("聊天模型没有视频工厂", () => {
  assert.equal(videoFactoryKind({ provider: "openai", modelId: "gpt-4o" }), "none")
  assert.equal(videoFactoryKind({ provider: "openai", modelId: "grok-imagine-image-2.0" }), "none")
  assert.equal(videoFactoryKind({ provider: "fal", modelId: "fal-ai/flux/schnell" }), "none")
})

test("xAI 视频 Base URL：官方 OpenAI 才改打 x.ai，中转跟生图同一主机", () => {
  assert.equal(xaiVideoBaseURL("https://api.openai.com/v1"), "https://api.x.ai/v1")
  assert.equal(xaiVideoBaseURL("https://api.x.ai/v1"), "https://api.x.ai/v1")
  assert.equal(xaiVideoBaseURL(undefined), "https://api.x.ai/v1")
  assert.equal(xaiVideoBaseURL("https://relay.example.com/v1"), "https://relay.example.com/v1")
})
