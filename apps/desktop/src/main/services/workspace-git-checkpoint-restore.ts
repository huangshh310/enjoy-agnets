/**
 * 把工作区对齐到检查点快照：临时 GIT_INDEX_FILE + checkout-index。
 * 不移动 HEAD，不改用户暂存区。删除快照外未跟踪文件必须显式确认。
 */
import { promises as fs } from "node:fs"
import { resolveInsideWorkspace } from "./paths.ts"
import { planEnjoyCheckpointRestore } from "./workspace-git-checkpoint-plan.ts"
import {
  enjoyGitDir,
  enjoyTempIndexPath,
  runGitIndex
} from "./workspace-git-checkpoint.ts"

export type RestoreEnjoyCheckpointResult =
  | { ok: true; restored: number }
  | { ok: false; code: "CHECKPOINT_CONFIRM_REQUIRED"; untrackedToDelete: string[] }

export async function restoreEnjoyCheckpoint(
  workspaceRoot: string,
  ref: string,
  opts: { confirmDeleteUntracked?: boolean } = {}
): Promise<RestoreEnjoyCheckpointResult> {
  const plan = await planEnjoyCheckpointRestore(workspaceRoot, ref)
  if (plan.untrackedToDelete.length > 0 && !opts.confirmDeleteUntracked) {
    return {
      ok: false,
      code: "CHECKPOINT_CONFIRM_REQUIRED",
      untrackedToDelete: plan.untrackedToDelete
    }
  }
  await applyCheckpointTree(workspaceRoot, plan.sha)
  const removed = await deleteListedPaths(workspaceRoot, [
    ...plan.trackedToDelete,
    ...plan.untrackedToDelete
  ])
  return { ok: true, restored: plan.keep.size + removed }
}

async function applyCheckpointTree(workspaceRoot: string, sha: string): Promise<void> {
  const gitAbs = await enjoyGitDir(workspaceRoot)
  if (!gitAbs) throw new Error("CHECKPOINT_NOT_FOUND")
  const indexFile = enjoyTempIndexPath(gitAbs, "restore")
  try {
    const read = await runGitIndex(workspaceRoot, ["read-tree", sha], indexFile)
    if (read.exitCode !== 0) {
      throw new Error(read.stderr.trim() || "CHECKPOINT_RESTORE_FAILED")
    }
    const checkout = await runGitIndex(workspaceRoot, ["checkout-index", "-a", "-f"], indexFile)
    if (checkout.exitCode !== 0) {
      throw new Error(checkout.stderr.trim() || "CHECKPOINT_RESTORE_FAILED")
    }
  } finally {
    await fs.unlink(indexFile).catch(() => undefined)
  }
}

async function deleteListedPaths(workspaceRoot: string, paths: string[]): Promise<number> {
  let removed = 0
  const seen = new Set<string>()
  for (const path of paths) {
    if (!path || seen.has(path)) continue
    seen.add(path)
    await fs.rm(resolveInsideWorkspace(workspaceRoot, path), { force: true, recursive: true })
    removed += 1
  }
  return removed
}
