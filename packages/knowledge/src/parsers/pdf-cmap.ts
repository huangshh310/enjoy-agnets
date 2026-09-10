/**
 * PDF ToUnicode CMap：bfchar / bfrange。不是完整 CMap 引擎，不解 CIDFont 无 ToUnicode 的 Identity-H。
 */

export type ToUnicodeMap = Map<number, string>

const MAX_RANGE = 4096

export function parseToUnicodeCmap(text: string): ToUnicodeMap {
  const map: ToUnicodeMap = new Map()
  if (!text.includes("begincmap") && !text.includes("beginbfchar") && !text.includes("beginbfrange")) {
    return map
  }
  parseBfChar(text, map)
  parseBfRange(text, map)
  return map
}

export function mergeToUnicode(into: ToUnicodeMap, extra: ToUnicodeMap): void {
  for (const [cid, value] of extra) {
    if (!into.has(cid)) into.set(cid, value)
  }
}

export function collectToUnicode(bodies: string[]): ToUnicodeMap {
  const map: ToUnicodeMap = new Map()
  for (const body of bodies) {
    if (!looksLikeCmap(body)) continue
    mergeToUnicode(map, parseToUnicodeCmap(body))
  }
  return map
}

export function looksLikeCmap(body: string): boolean {
  return body.includes("begincmap") || body.includes("beginbfchar") || body.includes("beginbfrange")
}

/** 按 2 字节 CID 再回落 1 字节。一个都没有则 null，让调用方走 latin1。 */
export function mapBytesThroughCmap(bytes: Uint8Array, cmap: ToUnicodeMap): string | null {
  if (cmap.size === 0 || bytes.length === 0) return null
  if (bytes.length % 2 === 0) {
    const wide = mapFixedWidth(bytes, 2, cmap)
    if (wide != null) return wide
  }
  return mapFixedWidth(bytes, 1, cmap)
}

function mapFixedWidth(bytes: Uint8Array, width: number, cmap: ToUnicodeMap): string | null {
  if (bytes.length % width !== 0) return null
  const parts: string[] = []
  let hits = 0
  for (let index = 0; index < bytes.length; index += width) {
    const cid = cidFromBytes(bytes, index, width)
    const mapped = cmap.get(cid)
    if (mapped != null) {
      parts.push(mapped)
      hits += 1
    }
  }
  if (hits === 0) return null
  return parts.join("")
}

function cidFromBytes(bytes: Uint8Array, offset: number, width: number): number {
  let cid = 0
  for (let index = 0; index < width; index += 1) {
    cid = (cid << 8) | bytes[offset + index]!
  }
  return cid
}

function parseBfChar(text: string, map: ToUnicodeMap): void {
  const blockRe = /beginbfchar([\s\S]*?)endbfchar/gi
  for (const block of text.matchAll(blockRe)) {
    const pairRe = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g
    for (const pair of block[1]?.matchAll(pairRe) ?? []) {
      const cid = Number.parseInt(pair[1] ?? "", 16)
      const dst = utf16BeFromHex(pair[2] ?? "")
      if (Number.isFinite(cid) && dst) map.set(cid, dst)
    }
  }
}

function parseBfRange(text: string, map: ToUnicodeMap): void {
  const blockRe = /beginbfrange([\s\S]*?)endbfrange/gi
  for (const block of text.matchAll(blockRe)) {
    parseBfRangeArray(block[1] ?? "", map)
    parseBfRangeIncrement(block[1] ?? "", map)
  }
}

function parseBfRangeIncrement(block: string, map: ToUnicodeMap): void {
  const rowRe = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g
  for (const row of block.matchAll(rowRe)) {
    fillIncrementRange(row[1] ?? "", row[2] ?? "", row[3] ?? "", map)
  }
}

function parseBfRangeArray(block: string, map: ToUnicodeMap): void {
  const rowRe = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([^\]]+)\]/g
  for (const row of block.matchAll(rowRe)) {
    const lo = Number.parseInt(row[1] ?? "", 16)
    const dests = [...(row[3] ?? "").matchAll(/<([0-9A-Fa-f]+)>/g)].map((item) => utf16BeFromHex(item[1] ?? ""))
    for (let index = 0; index < dests.length; index += 1) {
      const dest = dests[index]
      if (dest) map.set(lo + index, dest)
    }
  }
}

function fillIncrementRange(loHex: string, hiHex: string, dstHex: string, map: ToUnicodeMap): void {
  const lo = Number.parseInt(loHex, 16)
  const hi = Number.parseInt(hiHex, 16)
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) return
  if (hi - lo > MAX_RANGE) return
  const start = Number.parseInt(dstHex, 16)
  if (!Number.isFinite(start) || dstHex.length > 4) {
    const once = utf16BeFromHex(dstHex)
    if (once) map.set(lo, once)
    return
  }
  for (let cid = lo; cid <= hi; cid += 1) {
    map.set(cid, String.fromCharCode(start + (cid - lo)))
  }
}

function utf16BeFromHex(hex: string): string {
  const padded = hex.length % 4 === 0 ? hex : hex.padStart(Math.ceil(hex.length / 4) * 4, "0")
  const units: number[] = []
  for (let offset = 0; offset < padded.length; offset += 4) {
    units.push(Number.parseInt(padded.slice(offset, offset + 4), 16))
  }
  return String.fromCharCode(...units.filter((unit) => Number.isFinite(unit)))
}
