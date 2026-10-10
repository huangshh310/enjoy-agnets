/**
 * 工作区是不是自己的 Git 仓库。失败与干净仓库必须能分开。
 */
import { runGit } from "./command"

export async function detectGitRepo(workspaceRoot: string): Promise<boolean> {
  const inside = await runGit(workspaceRoot, ["rev-parse", "--is-inside-work-tree"])
  return inside.exitCode === 0 && inside.stdout.trim() === "true"
}
