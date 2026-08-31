/**
 * 确定性分块：chunk id = hash(path + 行范围 + 文本)。
 */
import { createHash } from "node:crypto"

export type TextChunk = {
  id: string
  path: string
  startLine: number
  endLine: number
  text: string
}

const DEFAULT_LINES = 40

export function chunkText(path: string, content: string, linesPerChunk = DEFAULT_LINES): TextChunk[] {
  const lines = content.split(/\r?\n/)
  const chunks: TextChunk[] = []
  for (let start = 0; start < lines.length; start += linesPerChunk) {
    const slice = lines.slice(start, start + linesPerChunk)
    const text = slice.join("\n").trim()
    if (!text) continue
    const startLine = start + 1
    const endLine = start + slice.length
    chunks.push({
      id: chunkId(path, startLine, endLine, text),
      path,
      startLine,
      endLine,
      text
    })
  }
  return chunks
}

export function chunkId(path: string, startLine: number, endLine: number, text: string): string {
  return createHash("sha256").update(`${path}:${startLine}:${endLine}:${text}`).digest("hex")
}
