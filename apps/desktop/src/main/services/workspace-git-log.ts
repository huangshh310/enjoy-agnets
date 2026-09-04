/**
 * git log 纯解析：线性提交列表，不是分支拓扑图。
 */
import type { GitCommitItem } from "@enjoy-agents/ipc-contract"

const UNIT_SEP = "\x1f"

/**
 * 解析 `git log --pretty=format:... --shortstat` 的 stdout。
 * 字段由 `%x1f` 分隔；shortstat 行紧跟在每条提交后。
 */
export function parseGitLogStdout(stdout: string): GitCommitItem[] {
  const commits: GitCommitItem[] = []
  let current: GitCommitItem | null = null

  for (const rawLine of stdout.split("\n")) {
    const line = rawLine.trim()
    if (!line) continue
    if (line.includes(UNIT_SEP)) {
      if (current) commits.push(current)
      current = parseCommitHeader(line)
      continue
    }
    if (current && line.includes("changed")) {
      applyShortstat(current, line)
    }
  }
  if (current) commits.push(current)
  return commits
}

function parseCommitHeader(line: string): GitCommitItem {
  const parts = line.split(UNIT_SEP)
  return {
    hash: parts[0] || "",
    shortHash: parts[1] || "",
    message: parts[2] || "",
    authorName: parts[3] || "",
    authorEmail: parts[4] || "",
    relativeTime: parts[5] || "",
    date: parts[6] || "",
    filesChanged: 0,
    additions: 0,
    deletions: 0
  }
}

function applyShortstat(commit: GitCommitItem, line: string) {
  const filesMatch = line.match(/(\d+)\s+file/)
  const insertMatch = line.match(/(\d+)\s+insertion/)
  const deleteMatch = line.match(/(\d+)\s+deletion/)
  if (filesMatch) commit.filesChanged = Number(filesMatch[1])
  if (insertMatch) commit.additions = Number(insertMatch[1])
  if (deleteMatch) commit.deletions = Number(deleteMatch[1])
}
