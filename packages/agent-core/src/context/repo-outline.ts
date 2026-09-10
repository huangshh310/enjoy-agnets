/**
 * 工作区大纲：深度/条数受限的目录骨架，给模型当地图，不是整仓 dump。
 */
export const REPO_OUTLINE_MAX_DEPTH = 3
export const REPO_OUTLINE_MAX_ENTRIES = 80
export const REPO_OUTLINE_CHAR_BUDGET = 4_000

const IGNORED = new Set([
  "node_modules",
  ".git",
  "dist",
  "out",
  ".turbo",
  "coverage",
  ".next",
  "build",
  "vendor",
  ".cache"
])

const ENTRY_FILES = new Set([
  "package.json",
  "pnpm-workspace.yaml",
  "cargo.toml",
  "go.mod",
  "pyproject.toml",
  "readme.md",
  "agents.md",
  "claude.md"
])

export type OutlineDirEntry = { name: string; kind: "file" | "directory" }
export type OutlineNode = { path: string; kind: "file" | "directory" }

export type ListDirFn = (relativePath: string) => Promise<OutlineDirEntry[]>

/**
 * 广度优先收集大纲。忽略构建目录；每层优先目录和入口文件。
 */
export async function collectRepoOutline(
  listDir: ListDirFn,
  options?: { maxDepth?: number; maxEntries?: number }
): Promise<OutlineNode[]> {
  const maxDepth = options?.maxDepth ?? REPO_OUTLINE_MAX_DEPTH
  const maxEntries = options?.maxEntries ?? REPO_OUTLINE_MAX_ENTRIES
  const nodes: OutlineNode[] = []
  const queue: Array<{ path: string; depth: number }> = [{ path: ".", depth: 0 }]
  while (queue.length > 0 && nodes.length < maxEntries) {
    const current = queue.shift()
    if (!current) break
    const entries = await safeList(listDir, current.path)
    const ranked = rankEntries(entries)
    for (const entry of ranked) {
      if (nodes.length >= maxEntries) break
      if (IGNORED.has(entry.name) || entry.name.startsWith(".")) continue
      const rel = joinRel(current.path, entry.name)
      nodes.push({ path: rel, kind: entry.kind })
      if (entry.kind === "directory" && current.depth + 1 < maxDepth) {
        queue.push({ path: rel, depth: current.depth + 1 })
      }
    }
  }
  return nodes
}

/** 拼进系统提示；超预算截断并注明省略。 */
export function formatRepoOutline(
  nodes: readonly OutlineNode[],
  budget = REPO_OUTLINE_CHAR_BUDGET
): string {
  if (nodes.length === 0) return ""
  const header = "# Workspace outline (not the full tree)\nUse repo_outline or glob/grep for more."
  const lines = [header]
  let remaining = Math.max(0, budget - header.length)
  let omitted = 0
  for (const node of nodes) {
    const line = node.kind === "directory" ? `- ${node.path}/` : `- ${node.path}`
    if (line.length + 1 > remaining) {
      omitted += 1
      continue
    }
    lines.push(line)
    remaining -= line.length + 1
  }
  if (omitted > 0) lines.push(`[truncated: ${omitted} path(s)]`)
  return lines.join("\n")
}

function rankEntries(entries: OutlineDirEntry[]): OutlineDirEntry[] {
  return [...entries].sort((left, right) => {
    const leftDir = left.kind === "directory" ? 0 : 1
    const rightDir = right.kind === "directory" ? 0 : 1
    if (leftDir !== rightDir) return leftDir - rightDir
    const leftEntry = ENTRY_FILES.has(left.name.toLowerCase()) ? 0 : 1
    const rightEntry = ENTRY_FILES.has(right.name.toLowerCase()) ? 0 : 1
    if (leftEntry !== rightEntry) return leftEntry - rightEntry
    return left.name.localeCompare(right.name)
  })
}

function joinRel(parent: string, name: string): string {
  return parent === "." ? name : `${parent.replace(/\\/g, "/")}/${name}`
}

async function safeList(listDir: ListDirFn, path: string): Promise<OutlineDirEntry[]> {
  try {
    return await listDir(path)
  } catch {
    return []
  }
}
