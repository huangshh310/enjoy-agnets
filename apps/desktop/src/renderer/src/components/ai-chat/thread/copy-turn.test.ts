/**
 * 复制正文与图片资产选择。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { firstImageAsset, textToCopy } from "./copy-turn.ts"

const base = {
  id: "m1",
  role: "assistant" as const,
  content: "",
  createdAt: 1
}

test("生图轮复制上一轮 prompt", () => {
  assert.equal(textToCopy({ ...base, content: "" }, "大熊的呢"), "大熊的呢")
  assert.equal(textToCopy({ ...base, content: "hello" }, "ignored"), "hello")
})

test("优先找图片资产给剪贴板", () => {
  const image = firstImageAsset({
    ...base,
    assets: [
      { assetId: "a1", mediaType: "application/pdf", name: "x.pdf" },
      { assetId: "a2", mediaType: "image/png", name: "bear.png" }
    ]
  })
  assert.equal(image?.assetId, "a2")
})
