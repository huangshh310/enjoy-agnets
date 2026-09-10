/**
 * 为 @ 面板收集工作区条目。空查询只展示根；有查询再 BFS 扁平化，有上限。
 */
export type MentionDirEntry = { name: string; path: string; kind: "file" | "directory" }

export const MENTION_FILE_LIMIT = 400

export async function collectMentionFiles(
  listDir: (path: string) => Promise<MentionDirEntry[]>,
  limit = MENTION_FILE_LIMIT
): Promise<MentionDirEntry[]> {
  const roots = await listDir(".")
  const out: MentionDirEntry[] = []
  const queue = [...roots]
  while (queue.length > 0 && out.length < limit) {
    const entry = queue.shift()
    if (!entry) break
    out.push(entry)
    if (entry.kind !== "directory") continue
    try {
      const kids = await listDir(entry.path)
      queue.push(...kids)
    } catch {
      // 单个目录读失败不打断其余条目。
    }
  }
  return out
}
