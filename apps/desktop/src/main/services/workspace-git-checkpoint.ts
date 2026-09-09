/**
 * 写盘后记 refs/enjoy/checkpoints/<stamp>。
 * 用临时 index + commit-tree，不改用户当前分支、不碰工作区 index。
 */
import { promises as fs } from "node:fs"
import { isAbsolute, join, resolve, sep } from "node:path"
import { runExecutable, runGit } from "./command.ts"

export type EnjoyCheckpointRecord = {
  ref: string
  sha: string
  createdAt: number
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
export async function recordEnjoyCheckpoint(workspaceRoot: string): Promise<string | null> {
  const gitAbs = await enjoyGitDir(workspaceRoot)
  if (!gitAbs) return null
  const indexFile = join(gitAbs, `enjoy-index-${process.pid}-${Date.now()}`)
  const env = { GIT_INDEX_FILE: indexFile }
  try {
    const sha = await commitWorktreeSnapshot(workspaceRoot, env)
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
    "--format=%(refname)%09%(objectname)",
    "--sort=-refname",
    "refs/enjoy/checkpoints"
  ])
  if (result.exitCode !== 0) return []
  const items: EnjoyCheckpointRecord[] = []
  for (const line of result.stdout.split("\n")) {
    const [ref, sha] = line.trim().split("\t")
    const createdAt = parseEnjoyCheckpointRef(ref ?? "")
    if (!createdAt || !sha) continue
    items.push({ ref: ref ?? "", sha, createdAt })
  }
  return items
}

async function commitWorktreeSnapshot(
  workspaceRoot: string,
  env: NodeJS.ProcessEnv
): Promise<string | null> {
  const hasHead = (await runGit(workspaceRoot, ["rev-parse", "--verify", "HEAD"])).exitCode === 0
  if (hasHead) {
    const read = await gitEnv(workspaceRoot, ["read-tree", "HEAD"], env)
    if (read.exitCode !== 0) return null
  }
  if ((await gitEnv(workspaceRoot, ["add", "-A"], env)).exitCode !== 0) return null
  const tree = (await gitEnv(workspaceRoot, ["write-tree"], env)).stdout.trim()
  if (!tree) return null
  const args = hasHead
    ? ["commit-tree", tree, "-p", "HEAD", "-m", "enjoy checkpoint"]
    : ["commit-tree", tree, "-m", "enjoy checkpoint"]
  const sha = (await gitEnv(workspaceRoot, args, env)).stdout.trim()
  return sha || null
}

function gitEnv(cwd: string, args: string[], extraEnv: NodeJS.ProcessEnv) {
  return runExecutable(cwd, "git", args, 30_000, extraEnv)
}

function pathInside(root: string, target: string): boolean {
  const base = resolve(root)
  const abs = resolve(target)
  return abs === base || abs.startsWith(base + sep)
}
