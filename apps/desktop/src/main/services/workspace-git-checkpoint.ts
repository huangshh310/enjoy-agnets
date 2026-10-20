/**
 * 写盘后记 refs/enjoy/checkpoints/<stamp>。
 * 用临时 index + commit-tree，不改用户当前分支、不碰工作区 index。
 * 内部快照一律用 Enjoy 身份（env 覆盖，不写用户 git config）：没配 user.name/email 也能记，
 * 隐藏 ref 里也不带用户身份。失败带 git stderr 记日志并返回 null。
 */
import { promises as fs } from "node:fs"
import { isAbsolute, join, resolve, sep } from "node:path"
import { runExecutable, runGit } from "./command.ts"
import {
  formatCheckpointSubject,
  parseCheckpointSubject,
  type EnjoyCheckpointMeta
} from "./workspace-git-checkpoint-meta.ts"

export type { EnjoyCheckpointKind, EnjoyCheckpointMeta } from "./workspace-git-checkpoint-meta.ts"

export type EnjoyCheckpointRecord = {
  ref: string
  sha: string
  createdAt: number
  sessionId?: string
  runId?: string
  kind?: EnjoyCheckpointMeta["kind"]
}

/** 内部检查点提交的固定身份；env 优先级高于任何 config（含 user.useConfigOnly）。 */
export const ENJOY_CHECKPOINT_IDENTITY_ENV: Readonly<Record<string, string>> = Object.freeze({
  GIT_AUTHOR_NAME: "Enjoy",
  GIT_AUTHOR_EMAIL: "enjoy@local",
  GIT_COMMITTER_NAME: "Enjoy",
  GIT_COMMITTER_EMAIL: "enjoy@local"
})

type SnapshotStep = "read-tree" | "add" | "write-tree" | "commit-tree" | "update-ref"
type SnapshotOutcome = { ok: true; sha: string } | { ok: false; step: SnapshotStep; stderr: string }

export function enjoyCheckpointRef(stamp: number): string {
  return `refs/enjoy/checkpoints/${stamp}`
}

/** 只认 refs/enjoy/checkpoints/<数字>，拒绝 heads / 逃逸。 */
export function parseEnjoyCheckpointRef(ref: string): number | null {
  const match = /^refs\/enjoy\/checkpoints\/(\d+)$/.exec(ref.trim())
  if (!match) return null
  const stamp = Number(match[1])
  if (!Number.isSafeInteger(stamp) || stamp <= 0) return null
  return stamp
}

/** 工作区自己的 .git；嵌在别人的仓库里返回 null。 */
export async function enjoyGitDir(workspaceRoot: string): Promise<string | null> {
  const gitDir = (await runGit(workspaceRoot, ["rev-parse", "--git-dir"])).stdout.trim()
  if (!gitDir) return null
  const gitAbs = isAbsolute(gitDir) ? gitDir : join(workspaceRoot, gitDir)
  return pathInside(workspaceRoot, gitAbs) ? gitAbs : null
}

/** 当前工作树快照；非 git 仓库返回 null。 */
export async function recordEnjoyCheckpoint(
  workspaceRoot: string,
  meta?: EnjoyCheckpointMeta
): Promise<string | null> {
  const gitAbs = await enjoyGitDir(workspaceRoot)
  if (!gitAbs) return null
  const indexFile = enjoyTempIndexPath(gitAbs, "record")
  try {
    const snap = await commitWorktreeSnapshot(workspaceRoot, indexFile, formatCheckpointSubject(meta))
    if (!snap.ok) return logRecordFailure(workspaceRoot, meta, snap.step, snap.stderr)
    const ref = enjoyCheckpointRef(Date.now())
    const updated = await runGit(workspaceRoot, ["update-ref", ref, snap.sha])
    if (updated.exitCode !== 0) return logRecordFailure(workspaceRoot, meta, "update-ref", updated.stderr)
    return ref
  } finally {
    await fs.unlink(indexFile).catch(() => undefined)
  }
}

export async function listEnjoyCheckpoints(workspaceRoot: string): Promise<string[]> {
  return (await listEnjoyCheckpointItems(workspaceRoot)).map((item) => item.ref)
}

export async function listEnjoyCheckpointItems(
  workspaceRoot: string
): Promise<EnjoyCheckpointRecord[]> {
  if (!(await enjoyGitDir(workspaceRoot))) return []
  const result = await runGit(workspaceRoot, [
    "for-each-ref",
    "--format=%(refname)%09%(objectname)%09%(contents:subject)",
    "--sort=-refname",
    "refs/enjoy/checkpoints"
  ])
  if (result.exitCode !== 0) return []
  const items: EnjoyCheckpointRecord[] = []
  for (const line of result.stdout.split("\n")) {
    const [ref, sha, ...subjectParts] = line.trim().split("\t")
    const createdAt = parseEnjoyCheckpointRef(ref ?? "")
    if (!createdAt || !sha) continue
    items.push({
      ref: ref ?? "",
      sha,
      createdAt,
      ...parseCheckpointSubject(subjectParts.join("\t"))
    })
  }
  return items
}

async function commitWorktreeSnapshot(
  workspaceRoot: string,
  indexFile: string,
  message: string
): Promise<SnapshotOutcome> {
  const hasHead = (await runGit(workspaceRoot, ["rev-parse", "--verify", "HEAD"])).exitCode === 0
  if (hasHead) {
    const read = await runGitIndex(workspaceRoot, ["read-tree", "HEAD"], indexFile)
    if (read.exitCode !== 0) return { ok: false, step: "read-tree", stderr: read.stderr }
  }
  const added = await runGitIndex(workspaceRoot, ["add", "-A"], indexFile)
  if (added.exitCode !== 0) return { ok: false, step: "add", stderr: added.stderr }
  const written = await runGitIndex(workspaceRoot, ["write-tree"], indexFile)
  const tree = written.stdout.trim()
  if (written.exitCode !== 0 || !tree) return { ok: false, step: "write-tree", stderr: written.stderr }
  const args = hasHead
    ? ["commit-tree", tree, "-p", "HEAD", "-m", message]
    : ["commit-tree", tree, "-m", message]
  const committed = await runExecutable(workspaceRoot, "git", args, 30_000, {
    GIT_INDEX_FILE: indexFile,
    ...ENJOY_CHECKPOINT_IDENTITY_ENV
  })
  const sha = committed.stdout.trim()
  if (committed.exitCode !== 0 || !sha) return { ok: false, step: "commit-tree", stderr: committed.stderr }
  return { ok: true, sha }
}

/** 记账失败不能静默：带 git stderr 打主进程日志；调用方仍按 null（无记录）走。 */
function logRecordFailure(
  workspaceRoot: string,
  meta: EnjoyCheckpointMeta | undefined,
  step: SnapshotStep,
  stderr: string
): null {
  console.error("[checkpoint] record failed", {
    workspaceRoot,
    step,
    kind: meta?.kind,
    sessionId: meta?.sessionId,
    runId: meta?.runId,
    stderr: stderr.trim()
  })
  return null
}

/** 记账 / 还原共用临时 index，禁止写用户 `.git/index`。 */
export function enjoyTempIndexPath(gitAbs: string, purpose: "record" | "restore"): string {
  return join(gitAbs, `enjoy-index-${purpose}-${process.pid}-${Date.now()}`)
}

export function runGitIndex(cwd: string, args: string[], indexFile: string) {
  return runExecutable(cwd, "git", args, 30_000, { GIT_INDEX_FILE: indexFile })
}

function pathInside(root: string, target: string): boolean {
  const base = resolve(root)
  const abs = resolve(target)
  return abs === base || abs.startsWith(base + sep)
}
