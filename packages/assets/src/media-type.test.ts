import assert from "node:assert/strict"
import { test } from "node:test"
import {
  isImageMediaType,
  isPdfMediaType,
  isTextLikeMediaType,
  resolveMediaType
} from "./media-type.ts"

test("空 type 或 octet-stream 按扩展名推断", () => {
  assert.equal(resolveMediaType("user-guide.md", ""), "text/markdown")
  assert.equal(resolveMediaType("user-guide.md", "application/octet-stream"), "text/markdown")
  assert.equal(resolveMediaType("shot.PNG", ""), "image/png")
  assert.equal(resolveMediaType("notes.txt"), "text/plain")
})

test("已声明的具体 MIME 优先于扩展名", () => {
  assert.equal(resolveMediaType("shot.bin", "image/png"), "image/png")
  assert.equal(resolveMediaType("a.md", "text/plain"), "text/plain")
})

test("无法推断时才回落 octet-stream", () => {
  assert.equal(resolveMediaType("LICENSE", ""), "application/octet-stream")
  assert.equal(resolveMediaType("a.bin", "application/zip"), "application/zip")
})

test("文本 / 图片 / PDF 判定", () => {
  assert.equal(isTextLikeMediaType("text/markdown"), true)
  assert.equal(isTextLikeMediaType("application/json"), true)
  assert.equal(isImageMediaType("image/png"), true)
  assert.equal(isPdfMediaType("application/pdf"), true)
  assert.equal(isTextLikeMediaType("application/octet-stream"), false)
})
