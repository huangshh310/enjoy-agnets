import assert from "node:assert/strict"
import { deflateSync } from "node:zlib"
import { test } from "node:test"
import { extractPdfImages } from "./pdf-images.ts"
import { extractPdfOcrText } from "./pdf-ocr.ts"
import { parseDocument } from "./index.ts"

test("FlateDecode RGB 图像能抽出 PNM", () => {
  const pixels = Buffer.from([255, 0, 0, 0, 255, 0])
  const packed = deflateSync(pixels)
  const pdf = wrapImageStream(packed, "FlateDecode", 2, 1, "DeviceRGB")
  const images = extractPdfImages(pdf)
  assert.equal(images.length, 1)
  assert.equal(images[0]?.format, "pnm")
  assert.match(Buffer.from(images[0]?.bytes ?? []).toString("latin1"), /^P6\n2 1\n255\n/)
})

test("DCTDecode 图像当 JPEG 原样留下", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9])
  const pdf = wrapImageStream(jpeg, "DCTDecode", 1, 1, "DeviceRGB")
  const images = extractPdfImages(pdf)
  assert.equal(images[0]?.format, "jpeg")
  assert.equal(images[0]?.bytes[0], 0xff)
})

test("关闭 OCR 的扫描件仍是 pdf-unreadable", () => {
  const pixels = Buffer.from([10, 20, 30])
  const packed = deflateSync(pixels)
  const bytes = Buffer.from(wrapImageStream(packed, "FlateDecode", 1, 1, "DeviceRGB"), "latin1")
  const parsed = parseDocument("scan.pdf", bytes, { ocr: false })
  assert.equal(parsed.text, "")
  assert.equal(parsed.skipped, "pdf-unreadable")
})

test("注入 OCR 后扫描件抽出正文，不再假装 pdf-unreadable", () => {
  const pixels = Buffer.from([10, 20, 30])
  const packed = deflateSync(pixels)
  const bytes = Buffer.from(wrapImageStream(packed, "FlateDecode", 1, 1, "DeviceRGB"), "latin1")
  const parsed = parseDocument("scan.pdf", bytes, {
    ocr: () => "Invoice total 42"
  })
  assert.equal(parsed.skipped, undefined)
  assert.match(parsed.text, /Invoice total 42/)
})

test("有图像但 OCR 跑空时标 pdf-unreadable，不把像素当正文", () => {
  const pixels = Buffer.from([10, 20, 30])
  const packed = deflateSync(pixels)
  const bytes = Buffer.from(wrapImageStream(packed, "FlateDecode", 1, 1, "DeviceRGB"), "latin1")
  const parsed = extractPdfOcrText(bytes, () => null)
  assert.equal(parsed.text, "")
  assert.equal(parsed.skipped, "pdf-unreadable")
})

function wrapImageStream(
  data: Buffer,
  filter: string,
  width: number,
  height: number,
  color: string
): string {
  const dict = `<< /Subtype /Image /Filter /${filter} /Width ${width} /Height ${height} /ColorSpace /${color} /BitsPerComponent 8 /Length ${data.length} >>`
  return ["%PDF-1.4", "1 0 obj", dict, "stream", data.toString("latin1"), "endstream", "endobj", "%%EOF"].join(
    "\n"
  )
}
