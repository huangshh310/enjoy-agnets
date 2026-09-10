/**
 * 找出 PDF stream、按 /Filter 解压。内容流跳过图像 / XRef / Metadata。
 * DCTDecode 原样留下（本来就是 JPEG）。
 */
import { inflateRawSync, inflateSync } from "node:zlib"

export type PdfStream = { dict: string; bytes: Uint8Array }

export function decodedContentBodies(pdfLatin1: string): string[] {
  return decodeStreams(pdfLatin1, "content")
}

/** ObjStm 可能装着 ToUnicode，不当成页面算子抽词。 */
export function decodedObjStmBodies(pdfLatin1: string): string[] {
  return decodeStreams(pdfLatin1, "objstm")
}

function decodeStreams(pdfLatin1: string, kind: "content" | "objstm"): string[] {
  const bodies: string[] = []
  for (const stream of listPdfStreams(pdfLatin1)) {
    if (!includeStream(stream.dict, kind)) continue
    const decoded = applyFilters(stream.dict, stream.bytes)
    if (!decoded) continue
    bodies.push(Buffer.from(decoded).toString("latin1"))
  }
  return bodies
}

function includeStream(dict: string, kind: "content" | "objstm"): boolean {
  if (/\/Subtype\s*\/Image\b/.test(dict)) return false
  if (/\/Type\s*\/(?:XRef|Metadata)\b/.test(dict)) return false
  const objStm = /\/Type\s*\/ObjStm\b/.test(dict)
  return kind === "objstm" ? objStm : !objStm
}

export function listPdfStreams(raw: string): PdfStream[] {
  const found: PdfStream[] = []
  let from = 0
  while (from < raw.length) {
    const keyword = raw.indexOf("stream", from)
    if (keyword < 0) break
    const dataAt = dataOffsetAfterStreamKeyword(raw, keyword)
    if (dataAt == null) {
      from = keyword + 6
      continue
    }
    const dictStart = raw.lastIndexOf("<<", keyword)
    const dict = dictStart >= 0 ? raw.slice(dictStart, keyword) : ""
    const sliced = sliceStreamBytes(raw, dict, dataAt)
    found.push({ dict, bytes: sliced.bytes })
    from = sliced.nextFrom
  }
  return found
}

function dataOffsetAfterStreamKeyword(raw: string, keyword: number): number | null {
  if (keyword > 0 && /[A-Za-z]/.test(raw[keyword - 1] ?? "")) return null
  let dataAt = keyword + 6
  if (raw[dataAt] === "\r") dataAt += 1
  if (raw[dataAt] !== "\n") return null
  return dataAt + 1
}

function sliceStreamBytes(
  raw: string,
  dict: string,
  dataAt: number
): { bytes: Uint8Array; nextFrom: number } {
  const length = directLength(dict)
  if (length != null && dataAt + length <= raw.length) {
    return { bytes: latin1Slice(raw, dataAt, dataAt + length), nextFrom: dataAt + length }
  }
  const end = raw.indexOf("endstream", dataAt)
  if (end < 0) {
    return { bytes: latin1Slice(raw, dataAt, raw.length), nextFrom: raw.length }
  }
  let stop = end
  if (raw[stop - 1] === "\n") stop -= 1
  if (raw[stop - 1] === "\r") stop -= 1
  return { bytes: latin1Slice(raw, dataAt, stop), nextFrom: end + 9 }
}

function directLength(dict: string): number | null {
  const match = /\/Length\s+(\d+)\b/.exec(dict)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

export function applyFilters(dict: string, bytes: Uint8Array): Uint8Array | null {
  const filters = parseFilters(dict)
  let current = bytes
  for (const filter of filters) {
    if (filter === "FlateDecode" || filter === "Fl") {
      const inflated = inflatePdf(current)
      if (!inflated) return null
      current = inflated
      continue
    }
    if (filter === "DCTDecode" || filter === "DCT") continue
    if (filter) return null
  }
  return current
}

export function parseFilters(dict: string): string[] {
  const match = /\/Filter\s*(\/[A-Za-z0-9]+|\[\s*(?:\/[A-Za-z0-9]+\s*)*\])/.exec(dict)
  if (!match?.[1]) return []
  const token = match[1]
  if (token.startsWith("[")) {
    return [...token.matchAll(/\/([A-Za-z0-9]+)/g)].map((item) => item[1] ?? "")
  }
  return [token.slice(1)]
}

function inflatePdf(bytes: Uint8Array): Uint8Array | null {
  try {
    return inflateSync(bytes)
  } catch {
    try {
      return inflateRawSync(bytes)
    } catch {
      return null
    }
  }
}

function latin1Slice(raw: string, start: number, end: number): Uint8Array {
  const out = new Uint8Array(Math.max(end - start, 0))
  for (let index = 0; index < out.length; index += 1) {
    out[index] = raw.charCodeAt(start + index) & 0xff
  }
  return out
}
