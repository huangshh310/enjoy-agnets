/**
 * PDF 字面串 / 十六进制串。可选 ToUnicode CID 映射。
 */

export type PdfCidMapper = (bytes: Uint8Array) => string | null

export function readPdfLiteral(
  src: string,
  start: number,
  map?: PdfCidMapper
): { text: string; next: number } {
  let index = start + 1
  let depth = 1
  let raw = ""
  while (index < src.length && depth > 0) {
    const char = src[index]
    if (char === "\\" && index + 1 < src.length) {
      raw += char + src[index + 1]
      index += 2
      continue
    }
    if (char === "(") depth += 1
    if (char === ")") depth -= 1
    if (depth === 0) break
    raw += char
    index += 1
  }
  return { text: mappedOrUnicode(unescapePdfBytes(raw), map), next: index + 1 }
}

export function readPdfHex(
  src: string,
  start: number,
  map?: PdfCidMapper
): { text: string; next: number } | null {
  if (src[start] !== "<" || src[start + 1] === "<") return null
  const end = src.indexOf(">", start + 1)
  if (end < 0) return null
  const hex = src.slice(start + 1, end).replace(/\s/g, "")
  if (!hex || /[^0-9A-Fa-f]/.test(hex)) return null
  const bytes = pdfHexToBytes(hex)
  const mapped = map?.(bytes)
  if (mapped != null) return { text: mapped, next: end + 1 }
  return { text: decodeMaybeUtf16(Buffer.from(bytes).toString("latin1")), next: end + 1 }
}

export function pdfHexToBytes(hex: string): Uint8Array {
  const padded = hex.length % 2 === 0 ? hex : `${hex}0`
  const out = new Uint8Array(padded.length / 2)
  for (let offset = 0; offset < out.length; offset += 1) {
    out[offset] = Number.parseInt(padded.slice(offset * 2, offset * 2 + 2), 16)
  }
  return out
}

function mappedOrUnicode(latin1: string, map?: PdfCidMapper): string {
  if (map) {
    const mapped = map(Buffer.from(latin1, "latin1"))
    if (mapped != null) return mapped
  }
  return decodeMaybeUtf16(latin1)
}

function unescapePdfBytes(raw: string): string {
  let out = ""
  for (let index = 0; index < raw.length; index += 1) {
    if (raw[index] !== "\\") {
      out += raw[index]
      continue
    }
    index += applyEscape(raw, index, (chunk) => {
      out += chunk
    })
  }
  return out
}

function applyEscape(raw: string, index: number, push: (chunk: string) => void): number {
  const next = raw[index + 1]
  if (next === "n") { push("\n"); return 1 }
  if (next === "r") { push("\r"); return 1 }
  if (next === "t") { push("\t"); return 1 }
  if (next === "b" || next === "f") return 1
  if (next === "(" || next === ")" || next === "\\") { push(next); return 1 }
  if (next === "\n" || next === "\r") return next === "\r" && raw[index + 2] === "\n" ? 2 : 1
  if (next && next >= "0" && next <= "7") {
    const oct = raw.slice(index + 1, index + 4).match(/^[0-7]{1,3}/)?.[0] ?? ""
    push(String.fromCharCode(Number.parseInt(oct, 8)))
    return oct.length
  }
  return 0
}

function decodeMaybeUtf16(latin1: string): string {
  if (latin1.length >= 2 && latin1.charCodeAt(0) === 0xfe && latin1.charCodeAt(1) === 0xff) {
    const body = latin1.slice(2)
    const units: number[] = []
    for (let index = 0; index + 1 < body.length; index += 2) {
      units.push((body.charCodeAt(index) << 8) | body.charCodeAt(index + 1))
    }
    return String.fromCharCode(...units)
  }
  return latin1
}
