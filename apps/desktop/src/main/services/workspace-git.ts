/**
 * 工作区 Git 变更列表与单文件 unified diff。只收 rootPath，避免回指档案层。
 */
import { promises as fs } from "node:fs"
import { diffTexts, parseUnifiedDiff, toUnifiedDiff } from "@enjoy-agents/agent-core"
import { runGit } from "./command"
import { resolveInsideWorkspace } from "./paths"

type ChangeRow = {
  path: string
  status: "added" | "modified" | "deleted" | "untracked"
  additions: number
  deletions: number
}

export async function changedFiles(workspaceRoot: string): Promise<ChangeRow[]> {
  const status = (await runGit(workspaceRoot, ["status", "--porcelain"])).stdout
  const counts = await readNumstat(workspaceRoot)
  const rows = status
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => parsePorcelainLine(line, counts))
  await fillUntrackedCounts(workspaceRoot, rows)
  return rows
}

export async function readFileDiff(workspaceRoot: string, relativePath: string) {
  const raw = await fileUnifiedDiff(workspaceRoot, relativePath)
  const model = raw.trim()
    ? parseUnifiedDiff(raw, relativePath)
    : await emptyFileAsDiff(workspaceRoot, relativePath)
  return {
    path: relativePath,
    diff: toUnifiedDiff(model),
    additions: model.additions,
    deletions: model.deletions
  }
}

function parsePorcelainLine(
  line: string,
  counts: Map<string, { additions: number; deletions: number }>
): ChangeRow {
  const code = line.slice(0, 2).trim()
  const filePath = line.slice(3).replace(/"/g, "")
  const statusMap: Record<string, ChangeRow["status"]> = {
    A: "added",
    M: "modified",
    D: "deleted",
    "??": "untracked"
  }
  const stat = counts.get(filePath) ?? { additions: 0, deletions: 0 }
  return {
    path: filePath,
    status: statusMap[code] ?? "modified",
    additions: stat.additions,
    deletions: stat.deletions
  }
}

async function fileUnifiedDiff(workspaceRoot: string, relativePath: string): Promise<string> {
  const unstaged = (await runGit(workspaceRoot, ["diff", "--", relativePath])).stdout
  if (unstaged.trim()) return unstaged
  return (await runGit(workspaceRoot, ["diff", "--cached", "--", relativePath])).stdout
}

async function emptyFileAsDiff(workspaceRoot: string, relativePath: string) {
  try {
    const content = await fs.readFile(resolveInsideWorkspace(workspaceRoot, relativePath), "utf8")
    return diffTexts("", content, relativePath)
  } catch {
    return diffTexts("", "", relativePath)
  }
}

async function fillUntrackedCounts(
  workspaceRoot: string,
  rows: Array<{ path: string; status: string; additions: number; deletions: number }>
) {
  await Promise.all(
    rows
      .filter((row) => row.status === "untracked" && row.additions === 0)
      .map(async (row) => {
        try {
          const content = await fs.readFile(resolveInsideWorkspace(workspaceRoot, row.path), "utf8")
          row.additions = content.length === 0 ? 0 : content.split(/\r?\n/).length
        } catch {
          row.additions = 0
        }
      })
  )
}

async function readNumstat(workspaceRoot: string) {
  const counts = new Map<string, { additions: number; deletions: number }>()
  const chunks = [
    (await runGit(workspaceRoot, ["diff", "--numstat"])).stdout,
    (await runGit(workspaceRoot, ["diff", "--numstat", "--cached"])).stdout
  ]
  for (const chunk of chunks) {
    for (const line of chunk.split("\n")) {
      const match = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/)
      if (!match) continue
      const additions = match[1] === "-" ? 0 : Number(match[1])
      const deletions = match[2] === "-" ? 0 : Number(match[2])
      counts.set(match[3].replace(/"/g, ""), { additions, deletions })
    }
  }
  return counts
}
