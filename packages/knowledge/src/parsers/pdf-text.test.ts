/**
 * PDF 抽词：未压缩 Tj、FlateDecode 内容流；图像流不装成正文。
 */
import assert from "node:assert/strict"
import { deflateSync } from "node:zlib"
import { test } from "node:test"
import { parseDocument } from "./index.ts"
import { extractPdfText } from "./pdf-text.ts"

test("未压缩内容流抽出 Tj 文本", () => {
  const payload = "BT /F1 12 Tf 72 400 Td (Hello PDF) Tj ET\n"
  const bytes = Buffer.from(wrapPdfStream(payload, false), "latin1")
  const text = extractPdfText(bytes)
  assert.match(text, /Hello PDF/)
  assert.equal(parseDocument("note.pdf", bytes).skipped, undefined)
})

test("FlateDecode 内容流也能抽出 Tj", () => {
  const payload = "BT /F1 12 Tf 72 400 Td (Flate Hello) Tj ET\n"
  const bytes = Buffer.from(wrapPdfStream(payload, true), "latin1")
  const text = extractPdfText(bytes)
  assert.match(text, /Flate Hello/)
})

test("TJ 数组与换行算子拼成可读段落", () => {
  const payload = "BT [(Hel) -20 (lo)] TJ T* (World) Tj ET\n"
  const text = extractPdfText(Buffer.from(wrapPdfStream(payload, false), "latin1"))
  assert.match(text, /Hello/)
  assert.match(text, /World/)
})

test("只有图像流时标 pdf-unreadable，不把二进制当正文", () => {
  const junk = deflateSync(Buffer.from("\x00\x01\x02\x03binary"))
  const body = [
    "%PDF-1.4",
    "1 0 obj",
    `<< /Subtype /Image /Filter /FlateDecode /Length ${junk.length} /Width 1 /Height 1 >>`,
    "stream",
    junk.toString("latin1"),
    "endstream",
    "endobj",
    "%%EOF"
  ].join("\n")
  const parsed = parseDocument("scan.pdf", Buffer.from(body, "latin1"))
  assert.equal(parsed.text, "")
  assert.equal(parsed.skipped, "pdf-unreadable")
})

test("ToUnicode CMap 把 CID hex 抽成汉字", () => {
  const cmap = `begincmap
2 beginbfchar
<0001> <4F60>
<0002> <597D>
endbfchar
endcmap
`
  const content = "BT <0001> Tj <0002> Tj ET\n"
  const bytes = Buffer.from(wrapPdfObjects([cmap, content]), "latin1")
  const text = extractPdfText(bytes)
  assert.match(text, /你好/)
  assert.doesNotMatch(text, /begincmap/)
})

test("ObjStm 里的 ToUnicode 也能映 CID", () => {
  const cmap = `10 0
begincmap
1 beginbfchar
<0001> <4F60>
endbfchar
endcmap
`
  const cmapBytes = Buffer.from(cmap, "utf8")
  const content = "BT <0001> Tj ET\n"
  const contentBytes = Buffer.from(content, "utf8")
  const body = [
    "%PDF-1.5",
    "1 0 obj",
    `<< /Type /ObjStm /N 1 /First 4 /Length ${cmapBytes.length} >>`,
    "stream",
    cmapBytes.toString("latin1"),
    "endstream",
    "endobj",
    "2 0 obj",
    `<< /Length ${contentBytes.length} >>`,
    "stream",
    contentBytes.toString("latin1"),
    "endstream",
    "endobj",
    "%%EOF"
  ].join("\n")
  const text = extractPdfText(Buffer.from(body, "latin1"))
  assert.match(text, /你/)
  assert.doesNotMatch(text, /begincmap/)
})

test("不是 PDF 的空字节得到 pdf-unreadable", () => {
  const parsed = parseDocument("empty.pdf", new Uint8Array([0, 1, 2, 3]))
  assert.equal(parsed.skipped, "pdf-unreadable")
})

function wrapPdfObjects(contents: string[]): string {
  const objects = contents.map((content, index) => {
    const data = Buffer.from(content, "utf8")
    return [
      `${index + 1} 0 obj`,
      `<< /Length ${data.length} >>`,
      "stream",
      data.toString("latin1"),
      "endstream",
      "endobj"
    ].join("\n")
  })
  return ["%PDF-1.4", ...objects, "%%EOF"].join("\n")
}

function wrapPdfStream(content: string, flate: boolean): string {
  const payload = Buffer.from(content, "utf8")
  const data = flate ? deflateSync(payload) : payload
  const dict = flate
    ? `<< /Filter /FlateDecode /Length ${data.length} >>`
    : `<< /Length ${data.length} >>`
  return ["%PDF-1.4", "1 0 obj", dict, "stream", data.toString("latin1"), "endstream", "endobj", "%%EOF"].join(
    "\n"
  )
}
