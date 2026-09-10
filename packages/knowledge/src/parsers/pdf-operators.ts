/**
 * 从已解压的 PDF 内容流抽 Tj / TJ / ' / " 文本。
 */
import { mapBytesThroughCmap, type ToUnicodeMap } from "./pdf-cmap.ts"
import { readPdfHex, readPdfLiteral, type PdfCidMapper } from "./pdf-literal.ts"

export function extractPdfOperatorsText(content: string, cmap?: ToUnicodeMap): string {
  const map = cidMapper(cmap)
  const parts: string[] = []
  let index = 0
  while (index < content.length) {
    const consumed = takeOperatorText(content, index, parts, map)
    index += consumed
  }
  return normalizeExtracted(parts.join(""))
}

function cidMapper(cmap?: ToUnicodeMap): PdfCidMapper | undefined {
  if (!cmap || cmap.size === 0) return undefined
  return (bytes) => mapBytesThroughCmap(bytes, cmap)
}

function takeOperatorText(
  content: string,
  index: number,
  parts: string[],
  map?: PdfCidMapper
): number {
  const char = content[index]
  if (char === "(") return takeLiteralOp(content, index, parts, map)
  if (char === "<") return takeHexOp(content, index, parts, map)
  if (char === "[") return takeTjArray(content, index, parts, map)
  if (content.startsWith("T*", index)) {
    parts.push("\n")
    return 2
  }
  if (isMoveOp(content, index)) {
    parts.push("\n")
    return 2
  }
  return 1
}

function takeLiteralOp(
  content: string,
  index: number,
  parts: string[],
  map?: PdfCidMapper
): number {
  const lit = readPdfLiteral(content, index, map)
  const op = peekOp(content, lit.next)
  if (op === "Tj" || op === "'" || op === '"') parts.push(lit.text)
  return Math.max(lit.next - index, 1)
}

function takeHexOp(
  content: string,
  index: number,
  parts: string[],
  map?: PdfCidMapper
): number {
  const hex = readPdfHex(content, index, map)
  if (!hex) return 1
  if (peekOp(content, hex.next) === "Tj") parts.push(hex.text)
  return Math.max(hex.next - index, 1)
}

function takeTjArray(
  content: string,
  index: number,
  parts: string[],
  map?: PdfCidMapper
): number {
  const end = skipPdfArray(content, index, map)
  if (peekOp(content, end) !== "TJ") return 1
  parts.push(textFromTjArray(content.slice(index, end), map))
  return Math.max(end - index, 1)
}

function isMoveOp(content: string, index: number): boolean {
  const op = content.slice(index, index + 2)
  if (op !== "Td" && op !== "TD") return false
  const next = content[index + 2]
  return !next || /[^A-Za-z]/.test(next)
}

function peekOp(content: string, from: number): string {
  const match = content.slice(from).match(/^\s*(\/|[A-Za-z*'"][A-Za-z0-9*'"]*)/)
  return match?.[1] ?? ""
}

function skipPdfArray(content: string, start: number, map?: PdfCidMapper): number {
  let depth = 0
  let index = start
  while (index < content.length) {
    const char = content[index]
    if (char === "(") {
      index = readPdfLiteral(content, index, map).next
      continue
    }
    if (char === "<" && content[index + 1] !== "<") {
      const hex = readPdfHex(content, index, map)
      index = hex ? hex.next : index + 1
      continue
    }
    if (char === "[") depth += 1
    if (char === "]") {
      depth -= 1
      index += 1
      if (depth === 0) return index
      continue
    }
    index += 1
  }
  return content.length
}

function textFromTjArray(slice: string, map?: PdfCidMapper): string {
  const bits: string[] = []
  let index = 0
  while (index < slice.length) {
    if (slice[index] === "(") {
      const lit = readPdfLiteral(slice, index, map)
      bits.push(lit.text)
      index = lit.next
      continue
    }
    if (slice[index] === "<") {
      const hex = readPdfHex(slice, index, map)
      if (hex) {
        bits.push(hex.text)
        index = hex.next
        continue
      }
    }
    index += 1
  }
  return bits.join("")
}

function normalizeExtracted(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
