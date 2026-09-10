/**
 * 把 PDF 图像原始像素收成 PNM，tesseract 能直接读，不必再引 PNG 库。
 */

export function encodePnm(
  pixels: Uint8Array,
  width: number,
  height: number,
  channels: 1 | 3
): Uint8Array | null {
  if (width <= 0 || height <= 0) return null
  const expected = width * height * channels
  if (pixels.length < expected) return null
  const header = Buffer.from(`${channels === 1 ? "P5" : "P6"}\n${width} ${height}\n255\n`)
  const body = pixels.subarray(0, expected)
  const out = new Uint8Array(header.length + body.length)
  out.set(header, 0)
  out.set(body, header.length)
  return out
}
