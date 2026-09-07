/**
 * 改动条全部撤销：已跟踪走 git restore，未跟踪删除。路径必须在工作区内。
 */
import { promises as fs } from "node:fs"
import { runGit } from "./command"
import { resolveInsideWorkspace } from "./paths"
import { parsePorcelainLine } from "./workspace-git-status"
import {
  assertHasRestoreTargets,
  normalizeRel,
  partitionRestorePaths
} from "./workspace-git-restore-split"

export { partitionRestorePaths } from "./workspace-git-restore-split"

export async function restoreWorkspacePaths(
  workspaceRoot: string,
  paths: string[]
): Promise<{ ok: true; restored: number }> {
  const jailed = paths.map((path) => {
    resolveInsideWorkspace(workspaceRoot, path)
    return normalizeRel(path)
  })
  const status = (await runGit(workspaceRoot, ["status", "--porcelain"])).stdout
  const rows = status
    .split("\n")
    .map((line) => parsePorcelainLine(line.trimEnd(), new Map()))
    .filter((row): row is NonNullable<typeof row> => row !== null)
  const split = partitionRestorePaths(jailed, rows)
  assertHasRestoreTargets(split)
  const { tracked, untracked } = split
  if (tracked.length > 0) {
    const restored = await runGit(workspaceRoot, [
      "restore",
      "--source=HEAD",
      "--staged",
      "--worktree",
      "--",
      ...tracked
    ])
    if (restored.exitCode !== 0) {
      throw new Error(restored.stderr || "git restore failed")
    }
  }
  for (const path of untracked) {
    await fs.rm(resolveInsideWorkspace(workspaceRoot, path), { force: true, recursive: true })
  }
  return { ok: true, restored: tracked.length + untracked.length }
}
