import assert from "node:assert/strict"
import test from "node:test"
import { applyCanvasGenerationEvent } from "./apply-canvas-generation-event.ts"

test("run.error 必须展示服务端原文，不能写成空 Generation failed", () => {
  const patch = applyCanvasGenerationEvent("loading", "image", {
    type: "run.error",
    message: "No provider key configured."
  })
  assert.equal(patch?.status, "error")
  assert.equal(patch?.errorDetails, "No provider key configured.")
})

test("asset.created 后 run.end 不得把成功打成失败", () => {
  const afterAsset = applyCanvasGenerationEvent("loading", "image", {
    type: "asset.created",
    assetId: "ast_1",
    mediaType: "image/png"
  })
  assert.equal(afterAsset?.status, "success")
  const afterEnd = applyCanvasGenerationEvent("success", "image", { type: "run.end" })
  assert.equal(afterEnd, null)
})

test("媒体 kind 收到 run.end 却还在 loading，视为没有产出", () => {
  const patch = applyCanvasGenerationEvent("loading", "image", { type: "run.end" })
  assert.equal(patch?.status, "error")
  assert.match(patch?.errorDetails ?? "", /no bytes/i)
})
