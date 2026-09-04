/**
 * 上游分支、分支对比文件、完整 patch、git push。
 * 上游失败返回空串，禁止回落 main。
 */

import type { GitCommitResult } from "@enjoy-agents/ipc-contract"
import { runGit } from "./command"
import type { ChangeRow } from "./workspace-git-status"

export async function readUpstream(workspaceRoot: string): Promise<string> {
  try {
    const res = await runGit(workspaceRoot, ["rev-parse", "--abbrev-ref", "@{upstream}"])
    return res.exitCode === 0 ? res.stdout.trim() : ""
  } catch {
    return ""
  }
}

export async function readBranchFiles(
  workspaceRoot: string,
  upstream: string
): Promise<ChangeRow[]> {
  if (!upstream) return []
  const range = `${upstream}...HEAD`
  const names = (await runGit(workspaceRoot, ["diff", "--name-status", range])).stdout
  const counts = parseNumstat((await runGit(workspaceRoot, ["diff", "--numstat", range])).stdout)
  const rows: ChangeRow[] = []
  for (const raw of names.split("\n")) {
    const line = raw.trim()
    if (!line) continue
    const statusCode = line[0] ?? "M"
    const path = line.slice(1).trim().replace(/"/g, "")
    if (!path) continue
    const stat = counts.get(path) ?? { additions: 0, deletions: 0 }
    rows.push({
      path,
      status: statusCode === "A" ? "added" : statusCode === "D" ? "deleted" : "modified",
      additions: stat.additions,
      deletions: stat.deletions,
      staged: false,
      worktree: false
    })
  }
  return rows
}

export async function readWorkspacePatch(
  workspaceRoot: string,
  paths?: string[]
): Promise<string> {
  const args = ["diff", "HEAD"]
  if (paths && paths.length > 0) args.push("--", ...paths)
  const tracked = (await runGit(workspaceRoot, args)).stdout
  return tracked.trim()
}

export async function pushWorkspace(workspaceRoot: string): Promise<GitCommitResult> {
  const upstream = await readUpstream(workspaceRoot)
  if (!upstream) {
    throw new Error("no upstream branch")
  }
  const res = await runGit(workspaceRoot, ["push"])
  if (res.exitCode !== 0) {
    throw new Error(res.stderr.trim() || "git push failed")
  }
  return { ok: true, output: (res.stdout || res.stderr).trim() }
}

function parseNumstat(stdout: string): Map<string, { additions: number; deletions: number }> {
  const counts = new Map<string, { additions: number; deletions: number }>()
  for (const line of stdout.split("\n")) {
    const match = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/)
    if (!match) continue
    counts.set(match[3].replace(/"/g, ""), {
      additions: match[1] === "-" ? 0 : Number(match[1]),
      deletions: match[2] === "-" ? 0 : Number(match[2])
    })
  }
  return counts
}
