/**
 * 写盘后记 refs/enjoy/checkpoints/<stamp>。
 * 用临时 index + commit-tree，不改用户当前分支、不碰工作区 index。
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
    const sha = await commitWorktreeSnapshot(workspaceRoot, indexFile, formatCheckpointSubject(meta))
    if (!sha) return null
    const ref = enjoyCheckpointRef(Date.now())
    const updated = await runGit(workspaceRoot, ["update-ref", ref, sha])
    return updated.exitCode === 0 ? ref : null
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
): Promise<string | null> {
  const hasHead = (await runGit(workspaceRoot, ["rev-parse", "--verify", "HEAD"])).exitCode === 0
  if (hasHead) {
    const read = await runGitIndex(workspaceRoot, ["read-tree", "HEAD"], indexFile)
    if (read.exitCode !== 0) return null
  }
  if ((await runGitIndex(workspaceRoot, ["add", "-A"], indexFile)).exitCode !== 0) return null
  const tree = (await runGitIndex(workspaceRoot, ["write-tree"], indexFile)).stdout.trim()
  if (!tree) return null
  const args = hasHead
    ? ["commit-tree", tree, "-p", "HEAD", "-m", message]
    : ["commit-tree", tree, "-m", message]
  const sha = (await runGitIndex(workspaceRoot, args, indexFile)).stdout.trim()
  return sha || null
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
