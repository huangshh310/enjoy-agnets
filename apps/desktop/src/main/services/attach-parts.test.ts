import assert from "node:assert/strict"
import { test } from "node:test"
import { encodeAttachmentParts } from "./attach-parts.ts"

const utf8 = (text: string) => new TextEncoder().encode(text)

test("markdown 编成带文件名的 text part，不走 file", () => {
  const parts = encodeAttachmentParts(
    [{ name: "user-guide.md", mediaType: "text/markdown", bytes: utf8("# Hello") }],
    { vision: true, files: false }
  )
  assert.equal(parts.length, 1)
  assert.equal(parts[0]?.kind, "text")
  if (parts[0]?.kind === "text") {
    assert.match(parts[0].text, /user-guide\.md/)
    assert.match(parts[0].text, /# Hello/)
  }
})

test("octet-stream 的 md 仍按文本处理", () => {
  const parts = encodeAttachmentParts(
    [{ name: "user-guide.md", mediaType: "application/octet-stream", bytes: utf8("doc") }],
    { vision: false, files: false }
  )
  assert.equal(parts[0]?.kind, "text")
})

test("图片在有 vision 时编 file part", () => {
  const parts = encodeAttachmentParts(
    [{ name: "shot.png", mediaType: "image/png", bytes: new Uint8Array([1, 2, 3]) }],
    { vision: true, files: false }
  )
  assert.equal(parts[0]?.kind, "file")
  if (parts[0]?.kind === "file") {
    assert.equal(parts[0].mediaType, "image/png")
    assert.equal(parts[0].filename, "shot.png")
  }
})

test("无 vision 时拒绝图片", () => {
  assert.throws(
    () =>
      encodeAttachmentParts(
        [{ name: "shot.png", mediaType: "image/png", bytes: new Uint8Array([1]) }],
        { vision: false, files: false }
      ),
    /vision/i
  )
})

test("无 files 时拒绝 PDF 与未知二进制", () => {
  assert.throws(
    () =>
      encodeAttachmentParts(
        [{ name: "a.pdf", mediaType: "application/pdf", bytes: new Uint8Array([1]) }],
        { vision: true, files: false }
      ),
    /files/i
  )
  assert.throws(
    () =>
      encodeAttachmentParts(
        [{ name: "a.bin", mediaType: "application/octet-stream", bytes: new Uint8Array([0, 1]) }],
        { vision: true, files: false }
      ),
    /binary|files/i
  )
})

test("有 files 时 PDF 走 file part", () => {
  const parts = encodeAttachmentParts(
    [{ name: "a.pdf", mediaType: "application/pdf", bytes: new Uint8Array([9]) }],
    { vision: false, files: true }
  )
  assert.equal(parts[0]?.kind, "file")
  if (parts[0]?.kind === "file") assert.equal(parts[0].mediaType, "application/pdf")
})
