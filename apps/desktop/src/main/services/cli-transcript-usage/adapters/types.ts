/**
 * 单源扫描器。unsupported 源不实现 adapter。
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
  const base = relPath.replaceAll("\\", "/").split("/").pop() ?? ""
  return base.endsWith(".jsonl")
}
