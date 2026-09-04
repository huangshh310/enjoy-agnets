/**
 * git status --porcelain 解析：保留 XY 双位，区分暂存区与工作区。
 * 禁止 trim 前两列，否则 " M" 与 "M " 会变成同一个 M。
 */

export type ChangeRow = {
  path: string
  status: "added" | "modified" | "deleted" | "untracked"
  additions: number
  deletions: number
  staged: boolean
  worktree: boolean
}

const STATUS_BY_CODE: Record<string, ChangeRow["status"]> = {
  A: "added",
  M: "modified",
  D: "deleted",
  R: "modified",
  C: "modified",
  U: "modified"
}

/**
 * 解析一行 porcelain。过短或空路径返回 null。
 */
export function parsePorcelainLine(
  line: string,
  counts: Map<string, { additions: number; deletions: number }>
): ChangeRow | null {
  if (line.length < 4) return null
  const indexCode = line[0] ?? " "
  const worktreeCode = line[1] ?? " "
  const filePath = line.slice(3).replace(/"/g, "").trim()
  if (!filePath) return null

  const untracked = indexCode === "?" && worktreeCode === "?"
  const staged = !untracked && indexCode !== " " && indexCode !== "!"
  const worktree = untracked || (worktreeCode !== " " && worktreeCode !== "!")
  const letter = untracked ? "?" : indexCode !== " " ? indexCode : worktreeCode
  const status: ChangeRow["status"] = untracked ? "untracked" : (STATUS_BY_CODE[letter] ?? "modified")
  const stat = counts.get(filePath) ?? { additions: 0, deletions: 0 }

  return {
    path: filePath,
    status,
    additions: stat.additions,
    deletions: stat.deletions,
    staged,
    worktree
  }
}
