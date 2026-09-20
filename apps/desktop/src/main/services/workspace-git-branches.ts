/**
 * 用户切分支：列本地 heads，switch 已有分支。脏工作树拒绝，不 -f。
 */
import type { GitBranchesResult, GitSwitchResult } from "@enjoy-agents/ipc-contract"
import { runGit } from "./command.ts"
import { assertGitBranchName } from "./workspace-git-branch.ts"

export function parseBranchList(stdout: string, current: string): GitBranchesResult["branches"] {
  const seen = new Set<string>()
  const branches: GitBranchesResult["branches"] = []
  for (const raw of stdout.split("\n")) {
    const name = raw.replace(/^\*?\s+/, "").trim()
    if (!name || name.includes("HEAD detached") || seen.has(name)) continue
    seen.add(name)
    branches.push({ name, current: name === current })
  }
  return branches
}

export async function listWorkspaceBranches(workspaceRoot: string): Promise<GitBranchesResult> {
  const current = (await runGit(workspaceRoot, ["branch", "--show-current"])).stdout.trim()
  const listed = await runGit(workspaceRoot, ["branch", "--list"])
  const branches = parseBranchList(listed.stdout, current)
  if (current && !branches.some((row) => row.name === current)) {
    branches.unshift({ name: current, current: true })
  }
  return { current, branches }
}

export async function switchWorkspaceBranch(
  workspaceRoot: string,
  name: string
): Promise<GitSwitchResult> {
  const safe = assertGitBranchName(name)
  const dirty = (await runGit(workspaceRoot, ["status", "--porcelain"])).stdout.trim()
  if (dirty) {
    return { ok: false, branch: "", code: "GIT_SWITCH_DIRTY", error: "Working tree has uncommitted changes." }
  }
  const switched = await runGit(workspaceRoot, ["switch", safe])
  if (switched.exitCode !== 0) {
    const fallback = await runGit(workspaceRoot, ["checkout", safe])
    if (fallback.exitCode !== 0) {
      return {
        ok: false,
        branch: "",
        code: "GIT_SWITCH_FAILED",
        error: fallback.stderr || switched.stderr || "git switch failed"
      }
    }
  }
  const current = (await runGit(workspaceRoot, ["branch", "--show-current"])).stdout.trim()
  return { ok: true, branch: current }
}
