/**
 * 知识文档收成 @ 发现条目。标题用人话文件名，不上协议 id。
 */
import type { MentionDoc } from "./build-mention-items.ts"

export function mentionDocsFromKnowledge(
  rows: ReadonlyArray<{ id: string; path: string }>
): MentionDoc[] {
  return rows
    .filter((row) => row.path.trim())
    .map((row) => ({
      id: row.id,
      path: row.path,
      name: docDisplayName(row.path)
    }))
}

export function docDisplayName(path: string): string {
  const normalized = path.replaceAll("\\", "/")
  const base = normalized.split("/").pop() || normalized
  return base.replace(/\.(md|mdx|txt|markdown)$/i, "") || base
}
