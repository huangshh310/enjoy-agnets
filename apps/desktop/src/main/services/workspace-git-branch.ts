/**
 * Agent git_branch：创建（可选切换）工作区分支。名称必须安全。
 */
import { runGit } from "./command.ts"

export function assertGitBranchName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 200) throw new Error("Invalid branch name.")
  if (trimmed.startsWith("-") || trimmed.includes("..") || trimmed.includes("\\")) {
    throw new Error("Invalid branch name.")
  }
  if (!/^[A-Za-z0-9._/\-]+$/.test(trimmed)) throw new Error("Invalid branch name.")
  return trimmed
}

export async function createWorkspaceBranch(
  workspaceRoot: string,
  name: string,
  checkout = false
): Promise<string> {
  const safe = assertGitBranchName(name)
  const created = await runGit(workspaceRoot, ["branch", safe])
  const output = `${created.stdout}\n${created.stderr}`
  if (created.exitCode !== 0 && !/already exists/i.test(output)) {
    throw new Error(created.stderr || "git branch failed")
  }
  if (checkout) {
    const switched = await runGit(workspaceRoot, ["switch", safe])
    if (switched.exitCode !== 0) {
      const fallback = await runGit(workspaceRoot, ["checkout", safe])
      if (fallback.exitCode !== 0) throw new Error(fallback.stderr || "git checkout failed")
    }
  }
  return (await runGit(workspaceRoot, ["branch", "--show-current"])).stdout.trim()
}
