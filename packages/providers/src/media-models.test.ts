import assert from "node:assert/strict"
import { test } from "node:test"
import { alternateImageModelId, alternateSpeechModelId, alternateTranscriptionModelId } from "./media-alts.ts"
import { pickMediaFallbackConfig } from "./media/fallback-config.ts"
import { mediaFactoryKind } from "./media/factory-kind.ts"
import { isMediaOnlyKind } from "./presets-media.ts"

test("图像备用模型在 dall-e 与 gpt-image 之间切换", () => {
  assert.equal(alternateImageModelId("dall-e-3"), "gpt-image-1")
  assert.equal(alternateImageModelId("gpt-image-1"), "dall-e-3")
  assert.equal(alternateImageModelId("flux"), "flux")
})

test("语音备用模型在 tts-1 与 tts-1-hd 之间切换", () => {
  assert.equal(alternateSpeechModelId("tts-1"), "tts-1-hd")
  assert.equal(alternateSpeechModelId("tts-1-hd"), "tts-1")
})

test("转写备用模型在 whisper 与 4o-mini-transcribe 之间切换", () => {
  assert.equal(alternateTranscriptionModelId("whisper-1"), "gpt-4o-mini-transcribe")
  assert.equal(alternateTranscriptionModelId("gpt-4o-mini-transcribe"), "whisper-1")
})

test("官方媒体 kind 走对应工厂，其余 OpenAI 兼容", () => {
  assert.equal(mediaFactoryKind("fal", "image"), "fal")
  assert.equal(mediaFactoryKind("replicate", "video"), "replicate")
  assert.equal(mediaFactoryKind("elevenlabs", "speech"), "elevenlabs")
  assert.equal(mediaFactoryKind("deepgram", "transcription"), "deepgram")
  assert.equal(mediaFactoryKind("cohere", "embedding"), "cohere")
  assert.equal(mediaFactoryKind("openai", "image"), "openai-compat")
  assert.equal(mediaFactoryKind("fal", "speech"), "openai-compat")
})

test("同族模型不变时改走另一官方媒体档案", () => {
  const next = pickMediaFallbackConfig(
    { provider: "openai", apiKey: "oa", modelId: "flux" },
    "flux",
    { kind: "fal", apiKey: "fal-key", modelId: "fal-ai/flux/schnell" }
  )
  assert.equal(next.provider, "fal")
  assert.equal(next.apiKey, "fal-key")
  assert.equal(next.modelId, "fal-ai/flux/schnell")
})

test("媒体 only kind 不能当聊天 LanguageModel", () => {
  assert.equal(isMediaOnlyKind("fal"), true)
  assert.equal(isMediaOnlyKind("elevenlabs"), true)
  assert.equal(isMediaOnlyKind("gateway"), false)
  assert.equal(isMediaOnlyKind("openai"), false)
})
