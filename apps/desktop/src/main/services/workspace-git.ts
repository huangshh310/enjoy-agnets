/**
 * 工作区 Git 变更列表、单文件 unified diff、线性提交日志与用户提交。
 * 只收 rootPath，避免回指档案层。提交执行在 main；UI 路径靠 ConfirmDialog 审批。
 */
import { promises as fs } from "node:fs"
import { diffTexts, parseUnifiedDiff, toUnifiedDiff } from "@enjoy-agents/agent-core"
import type { GitCommitResult, GitLogResult } from "@enjoy-agents/ipc-contract"
import { runGit } from "./command"
import { resolveInsideWorkspace } from "./paths"
import { parseGitLogStdout } from "./workspace-git-log"
import { parsePorcelainLine, type ChangeRow } from "./workspace-git-status"
import { readBranchFiles, readUpstream } from "./workspace-git-remote"

export type { ChangeRow }
export { parsePorcelainLine }

export async function changedFiles(workspaceRoot: string): Promise<ChangeRow[]> {
  const status = (await runGit(workspaceRoot, ["status", "--porcelain"])).stdout
  const counts = await readNumstat(workspaceRoot)
  const rows = status
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => parsePorcelainLine(line, counts))
    .filter((row): row is ChangeRow => row !== null)
  await fillUntrackedCounts(workspaceRoot, rows)
  return rows
}

export async function readFileDiff(
  workspaceRoot: string,
  relativePath: string,
  ignoreWhitespace = false
) {
  const raw = await fileUnifiedDiff(workspaceRoot, relativePath, ignoreWhitespace)
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

async function fileUnifiedDiff(
  workspaceRoot: string,
  relativePath: string,
  ignoreWhitespace = false
): Promise<string> {
  const extra = ignoreWhitespace ? ["-w"] : []
  const unstaged = (await runGit(workspaceRoot, ["diff", ...extra, "--", relativePath])).stdout
  if (unstaged.trim()) return unstaged
  return (await runGit(workspaceRoot, ["diff", ...extra, "--cached", "--", relativePath])).stdout
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

/** 当前分支名；detached HEAD 或非仓库返回空串，禁止回落 main。 */
async function readCurrentBranch(workspaceRoot: string): Promise<string> {
  try {
    const res = await runGit(workspaceRoot, ["branch", "--show-current"])
    return res.exitCode === 0 ? res.stdout.trim() : ""
  } catch {
    return ""
  }
}

/**
 * 读取工作区 Git 线性日志与当前分支。
 * 不是提交树：不解析 parent / graph，UI 不得用 index 伪装车道。
 */
export async function readGitLog(
  workspaceRoot: string,
  limit = 30,
  includeBranchFiles = false
): Promise<GitLogResult> {
  const branch = await readCurrentBranch(workspaceRoot)
  const upstream = await readUpstream(workspaceRoot)
  const branchFiles = includeBranchFiles ? await readBranchFiles(workspaceRoot, upstream) : []
  const capped = Math.min(Math.max(limit, 1), 100)
  try {
    const format = "%H%x1f%h%x1f%s%x1f%an%x1f%ae%x1f%cr%x1f%cd"
    const logRes = await runGit(workspaceRoot, [
      "log",
      `-n${capped}`,
      `--pretty=format:${format}`,
      "--shortstat"
    ])
    if (logRes.exitCode !== 0 || !logRes.stdout.trim()) {
      return { branch, upstream, branchFiles, commits: [] }
    }
    return { branch, upstream, branchFiles, commits: parseGitLogStdout(logRes.stdout) }
  } catch {
    return { branch, upstream, branchFiles, commits: [] }
  }
}

/**
 * 提交。stageAll 时先 git add -A；否则只提交已暂存。空工作树拒绝。
 */
export async function commitWorkspaceAll(
  workspaceRoot: string,
  message: string,
  stageAll = false
): Promise<GitCommitResult> {
  const status = (await runGit(workspaceRoot, ["status", "--porcelain"])).stdout.trim()
  if (!status) {
    throw new Error("nothing to commit")
  }
  if (stageAll) {
    const addRes = await runGit(workspaceRoot, ["add", "-A"])
    if (addRes.exitCode !== 0) {
      throw new Error(addRes.stderr || "git add failed")
    }
  }
  const commitRes = await runGit(workspaceRoot, ["commit", "-m", message])
  if (commitRes.exitCode !== 0) {
    throw new Error(commitRes.stderr || "git commit failed")
  }
  return {
    ok: true,
    output: commitRes.stdout.trim()
  }
}
