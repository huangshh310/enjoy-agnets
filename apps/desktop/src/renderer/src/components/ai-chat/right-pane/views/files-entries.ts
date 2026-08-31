/**
 * 工作区目录条目：排序与递归展开（不碰 IPC）。
 */
export type DirEntry = { name: string; path: string; kind: "file" | "directory" }

export function sortEntries(entries: DirEntry[]): DirEntry[] {
  return [...entries].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

const EXPAND_LIMIT = 80

/** 从根往下打开目录，有上限以免一次拉爆大仓库。 */
export async function expandDirectories(
  roots: DirEntry[],
  loaded: Record<string, DirEntry[]>,
  list: (path: string) => Promise<DirEntry[]>,
  limit = EXPAND_LIMIT
): Promise<{ open: Set<string>; children: Record<string, DirEntry[]> }> {
  const open = new Set<string>()
  const children = { ...loaded }
  const queue = roots.filter((entry) => entry.kind === "directory").map((entry) => entry.path)

  while (queue.length > 0 && open.size < limit) {
    const path = queue.shift()
    if (!path || open.has(path)) continue
    open.add(path)
    const rows = children[path] ?? (await list(path))
    children[path] = rows
    for (const row of rows) {
      if (row.kind === "directory") queue.push(row.path)
    }
  }
  return { open, children }
}
