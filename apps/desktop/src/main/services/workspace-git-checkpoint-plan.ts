/**
 * 检查点还原预案：校验白名单 ref，列出快照外已跟踪 / 未跟踪路径。不改工作区。
 */
import { runGit } from "./command.ts"
import { enjoyGitDir, parseEnjoyCheckpointRef } from "./workspace-git-checkpoint.ts"

export type EnjoyCheckpointRestorePlan = {
  ref: string
  sha: string
  keep: Set<string>
  trackedToDelete: string[]
  untrackedToDelete: string[]
}

export type EnjoyCheckpointRestorePreview = {
  ref: string
  sha: string
  trackedToDelete: string[]
  untrackedToDelete: string[]
}

export async function planEnjoyCheckpointRestore(
  workspaceRoot: string,
  ref: string
): Promise<EnjoyCheckpointRestorePlan> {
  if (parseEnjoyCheckpointRef(ref) == null) {
    throw new Error("CHECKPOINT_REF_INVALID")
  }
  if (!(await enjoyGitDir(workspaceRoot))) {
    throw new Error("CHECKPOINT_NOT_FOUND")
  }
  const sha = (await runGit(workspaceRoot, ["rev-parse", "--verify", ref])).stdout.trim()
  if (!sha) throw new Error("CHECKPOINT_NOT_FOUND")
  const keep = await treePaths(workspaceRoot, sha)
  const extras = await classifyExtras(workspaceRoot, keep)
  return { ref, sha, keep, ...extras }
}

export async function previewEnjoyCheckpointRestore(
  workspaceRoot: string,
  ref: string
): Promise<EnjoyCheckpointRestorePreview> {
  const plan = await planEnjoyCheckpointRestore(workspaceRoot, ref)
  return {
    ref: plan.ref,
    sha: plan.sha,
    trackedToDelete: plan.trackedToDelete,
    untrackedToDelete: plan.untrackedToDelete
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

async function classifyExtras(
  workspaceRoot: string,
  keep: Set<string>
): Promise<{ trackedToDelete: string[]; untrackedToDelete: string[] }> {
  const tracked = await runGit(workspaceRoot, ["ls-files", "-z"])
  const others = await runGit(workspaceRoot, ["ls-files", "--others", "--exclude-standard", "-z"])
  return {
    trackedToDelete: missingPaths(nulPaths(tracked.stdout), keep),
    untrackedToDelete: missingPaths(nulPaths(others.stdout), keep)
  }
}

function missingPaths(candidates: string[], keep: Set<string>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const path of candidates) {
    if (!path || keep.has(path) || seen.has(path)) continue
    seen.add(path)
    out.push(path)
  }
  return out
}

function nulPaths(stdout: string): string[] {
  return stdout.split("\0").map((item) => item.trim()).filter(Boolean)
}
