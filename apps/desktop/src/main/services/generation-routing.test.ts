import assert from "node:assert/strict"
import test from "node:test"
import { effectiveMediaModelId, pickGenerateProfile } from "./generation-routing.ts"

const vault = {
  activeId: "prv_chat",
  profiles: [
    { id: "prv_chat", kind: "openai" },
    { id: "prv_xai", kind: "xai" }
  ]
}

test("有 providerId 时用对应档案，不用当前激活档案", () => {
  const profile = pickGenerateProfile(vault, "prv_xai")
  assert.equal(profile?.id, "prv_xai")
})

test("没有 providerId 时回落当前激活档案", () => {
  const profile = pickGenerateProfile(vault)
  assert.equal(profile?.id, "prv_chat")
})

test("未知 providerId 回落当前激活档案", () => {
  const profile = pickGenerateProfile(vault, "prv_gone")
  assert.equal(profile?.id, "prv_chat")
})

test("画布选中 grok-imagine-image 不被 defaultImageModelId 覆盖", () => {
  const modelId = effectiveMediaModelId("image", "grok-imagine-image", {
    defaultImageModelId: "dall-e-3"
  })
  assert.equal(modelId, "grok-imagine-image")
})

test("聊天语言模型走生图时才用设置页默认模型", () => {
  const modelId = effectiveMediaModelId("image", "grok-4", {
    defaultImageModelId: "grok-imagine-image"
  })
  assert.equal(modelId, "grok-imagine-image")
})
