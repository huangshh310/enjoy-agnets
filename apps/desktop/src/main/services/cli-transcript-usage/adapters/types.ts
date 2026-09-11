/**
 * 单源扫描器。导轨 CLI 都实现 adapter。
 */
import type { CliUsageSourceId } from "@enjoy-agents/ipc-contract"
import type { UsageDelta } from "../parsers/parse-usage.ts"

export type CliUsageAdapter = {
  id: CliUsageSourceId
  roots: (home: string) => string[]
  /** 相对该 adapter 的 root，`/` 分隔。谓词为 false 的文件不计入 fileCount。 */
  matchRelPath: (relPath: string) => boolean
  parse: (text: string, ctx: { filePath: string; root: string }) => UsageDelta | null
}

export function matchJsonlRelPath(relPath: string): boolean {
  const parts = relPath.replaceAll("\\", "/").split("/").filter(Boolean)
  if (parts.includes("node_modules") || parts.includes("subagents")) return false
  const base = parts.at(-1) ?? ""
  return base.endsWith(".jsonl")
}

/** Cursor 只扫 agent-transcripts，避免把整个 projects 树当会话。 */
export function matchCursorTranscriptRelPath(relPath: string): boolean {
  const parts = relPath.replaceAll("\\", "/").split("/").filter(Boolean)
  if (!parts.includes("agent-transcripts")) return false
  return matchJsonlRelPath(relPath)
}
