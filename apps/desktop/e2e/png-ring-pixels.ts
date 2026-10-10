/**
 * 从 PNG 数黄环 / 灰环像素。软件渲染下棱镜 mask-composite 失败会长这样。
 */
import { inflateSync } from "node:zlib"

export function countHotYellowPixels(png: Buffer): number {
  return countRingPixels(png, "yellow")
}

export function countGreyRingPixels(png: Buffer): number {
  return countRingPixels(png, "grey")
}

export function countRingPixels(png: Buffer, kind: "yellow" | "grey"): number {
  const rows = decodePngRows(png)
  if (!rows) return -1
  let hits = 0
  for (const row of rows.pixels) {
    for (let x = 0; x < rows.width; x++) {
      const i = x * rows.bpp
      const r = row[i] ?? 0
      const g = row[i + 1] ?? 0
      const b = row[i + 2] ?? 0
      if (kind === "yellow" && r > 220 && g > 190 && b < 80) hits += 1
      if (kind === "grey" && isGreyRingPixel(r, g, b)) hits += 1
    }
  }
  return hits
}

function isGreyRingPixel(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lum = (r + g + b) / 3
  return lum > 88 && lum < 188 && max - min < 22
}

function decodePngRows(png: Buffer): { width: number; bpp: number; pixels: Buffer[] } | null {
  if (png[0] !== 0x89 || png[1] !== 0x50) return null
  let offset = 8
  let width = 0
  let height = 0
  let colorType = 0
  const idats: Buffer[] = []
  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.subarray(offset + 4, offset + 8).toString("ascii")
    const data = png.subarray(offset + 8, offset + 8 + length)
    if (type === "IHDR") {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      colorType = data[9] ?? 0
    }
    if (type === "IDAT") idats.push(data)
    if (type === "IEND") break
    offset += 12 + length
  }
  if (!width || !height || idats.length === 0) return null
  const raw = inflateSync(Buffer.concat(idats))
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 0
  if (!bpp) return null
  const stride = width * bpp
  const rows: Buffer[] = []
  let cursor = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[cursor] ?? 0
    cursor += 1
    const slice = raw.subarray(cursor, cursor + stride)
    cursor += stride
    const out = Buffer.alloc(stride)
    for (let i = 0; i < stride; i++) {
      const x = slice[i] ?? 0
      const a = i >= bpp ? (out[i - bpp] ?? 0) : 0
      const b = y > 0 ? (rows[y - 1]?.[i] ?? 0) : 0
      const c = y > 0 && i >= bpp ? (rows[y - 1]?.[i - bpp] ?? 0) : 0
      out[i] = unfilterPng(filter, x, a, b, c)
    }
    rows.push(out)
  }
  return { width, bpp, pixels: rows }
}

function unfilterPng(filter: number, x: number, a: number, b: number, c: number): number {
  if (filter === 1) return (x + a) & 255
  if (filter === 2) return (x + b) & 255
  if (filter === 3) return (x + Math.floor((a + b) / 2)) & 255
  if (filter === 4) {
    const p = a + b - c
    const pa = Math.abs(p - a)
    const pb = Math.abs(p - b)
    const pc = Math.abs(p - c)
    const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
    return (x + pr) & 255
  }
  return x
}
