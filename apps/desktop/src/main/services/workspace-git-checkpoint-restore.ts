/**
 * 把工作区对齐到检查点快照：换 index + 工作区，不移动 HEAD。
 */
import { promises as fs } from "node:fs"
import { runGit } from "./command.ts"
import { resolveInsideWorkspace } from "./paths.ts"
import { enjoyGitDir, parseEnjoyCheckpointRef } from "./workspace-git-checkpoint.ts"

export async function restoreEnjoyCheckpoint(
  workspaceRoot: string,
  ref: string
): Promise<{ ok: true; restored: number }> {
  if (parseEnjoyCheckpointRef(ref) == null) {
    throw new Error("CHECKPOINT_REF_INVALID")
  }
  if (!(await enjoyGitDir(workspaceRoot))) {
    throw new Error("CHECKPOINT_NOT_FOUND")
  }
  const sha = (await runGit(workspaceRoot, ["rev-parse", "--verify", ref])).stdout.trim()
  if (!sha) throw new Error("CHECKPOINT_NOT_FOUND")
  const keep = await treePaths(workspaceRoot, sha)
  const extras = await worktreeCandidates(workspaceRoot)
  await applyCheckpointTree(workspaceRoot, sha)
  const removed = await deleteMissingPaths(workspaceRoot, extras, keep)
  return { ok: true, restored: keep.size + removed }
}

async function applyCheckpointTree(workspaceRoot: string, sha: string): Promise<void> {
  const read = await runGit(workspaceRoot, ["read-tree", sha])
  if (read.exitCode !== 0) {
    throw new Error(read.stderr.trim() || "CHECKPOINT_RESTORE_FAILED")
  }
  const checkout = await runGit(workspaceRoot, ["checkout-index", "-a", "-f"])
  if (checkout.exitCode !== 0) {
    throw new Error(checkout.stderr.trim() || "CHECKPOINT_RESTORE_FAILED")
  }
}

async function treePaths(workspaceRoot: string, sha: string): Promise<Set<string>> {
  const listed = await runGit(workspaceRoot, ["ls-tree", "-r", "--name-only", sha])
  return new Set(
    listed.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  )
}

async function worktreeCandidates(workspaceRoot: string): Promise<string[]> {
  const tracked = await runGit(workspaceRoot, ["ls-files", "-z"])
  const others = await runGit(workspaceRoot, ["ls-files", "--others", "--exclude-standard", "-z"])
  return [...nulPaths(tracked.stdout), ...nulPaths(others.stdout)]
}

async function deleteMissingPaths(
  workspaceRoot: string,
  candidates: string[],
  keep: Set<string>
): Promise<number> {
  let removed = 0
  const seen = new Set<string>()
  for (const path of candidates) {
    if (!path || keep.has(path) || seen.has(path)) continue
    seen.add(path)
    await fs.rm(resolveInsideWorkspace(workspaceRoot, path), { force: true, recursive: true })
    removed += 1
  }
  return removed
}

function nulPaths(stdout: string): string[] {
  return stdout.split("\0").map((item) => item.trim()).filter(Boolean)
}
