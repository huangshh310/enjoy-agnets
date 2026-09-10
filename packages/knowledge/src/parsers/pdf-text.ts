/**
 * PDF 抽文本：解 FlateDecode 内容流，读 Tj/TJ，ToUnicode CMap 映射 CID。
 * 扫描件走 parseDocument 的 OCR 回落；无 ToUnicode 的 Identity-H / 嵌字体 cmap 仍可能 pdf-unreadable。
 */
import { collectToUnicode, looksLikeCmap } from "./pdf-cmap.ts"
import { extractPdfOperatorsText } from "./pdf-operators.ts"
import { decodedContentBodies, decodedObjStmBodies } from "./pdf-streams.ts"

export function extractPdfText(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes).toString("latin1")
  const bodies = decodedContentBodies(raw)
  const cmap = collectToUnicode([...bodies, ...decodedObjStmBodies(raw)])
  const fromStreams = bodies
    .filter((body) => !looksLikeCmap(body))
    .map((body) => extractPdfOperatorsText(body, cmap))
    .filter(Boolean)
  if (fromStreams.length > 0) return fromStreams.join("\n\n")
  return extractUncompressedTj(raw)
}

/** 无 /Filter 的内容流：只认 `(...) Tj`，避免二进制里乱括号。 */
export function extractUncompressedTj(raw: string): string {
  const parts: string[] = []
  const pattern = /\((?:\\.|[^\\)])+\)\s*(?:Tj|'|")/g
  for (const match of raw.matchAll(pattern)) {
    const token = match[0].replace(/\s*(?:Tj|'|")$/, "")
    const inner = token.slice(1, -1).replace(/\\n/g, "\n").replace(/\\\)/g, ")").replace(/\\\(/g, "(")
    if (inner.trim().length >= 2) parts.push(inner)
  }
  return parts.join("\n").trim()
}
