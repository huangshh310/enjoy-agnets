/**
 * SSH 工作区 git / diff / move：只问 host，禁止拿 user@host:path 当本机 root。
 */
import type { AgentWorkspaceHost } from "@enjoy-agents/agent-core"
import type { GitBranchesResult, GitLogResult, GitSwitchResult } from "@enjoy-agents/ipc-contract"
import { planWorkspaceMove } from "@enjoy-agents/ipc-contract/workspace-move-plan"
import { assertGitBranchName } from "./workspace-git-branch.ts"
import { parseBranchList } from "./workspace-git-branches.ts"
import { parseGitLogStdout } from "./workspace-git-log.ts"
import { expandStageTargets, stageGitArgs } from "./workspace-git-stage.ts"
import { parsePorcelainLine, type ChangeRow } from "./workspace-git-status.ts"
import { quoteRemote, resolveRemoteJail, toRemoteRelative } from "./ssh/ssh-path.ts"

export function changesFromGitStatus(stdout: string): ChangeRow[] {
  return stdout
    .split("\n")
    .map((line) => parsePorcelainLine(line.trimEnd(), new Map()))
    .filter((row): row is ChangeRow => row !== null)
}

export async function sshGit(
  host: AgentWorkspaceHost,
  args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const cmd = ["git", ...args].map((part) => quoteRemote(part)).join(" ")
  return host.bash(cmd)
}

export async function sshWorkspaceChanges(host: AgentWorkspaceHost): Promise<ChangeRow[]> {
  const status = await host.gitStatus()
  return changesFromGitStatus(status)
}

export async function sshWorkspaceGitLog(
  host: AgentWorkspaceHost,
  limit = 30
): Promise<GitLogResult> {
  const capped = Math.min(Math.max(limit, 1), 100)
  const branchRes = await sshGit(host, ["branch", "--show-current"])
  const branch = branchRes.exitCode === 0 ? branchRes.stdout.trim() : ""
  const format = "%H%x1f%h%x1f%s%x1f%an%x1f%ae%x1f%cr%x1f%cd"
  const logRes = await sshGit(host, ["log", `-n${capped}`, `--pretty=format:${format}`, "--shortstat"])
  const commits =
    logRes.exitCode === 0 && logRes.stdout.trim() ? parseGitLogStdout(logRes.stdout) : []
  return { branch, upstream: "", branchFiles: [], commits }
}

export async function sshWorkspaceDiff(host: AgentWorkspaceHost, relativePath: string) {
  const raw = await host.gitDiff(relativePath)
  const additions = (raw.match(/^\+(?!\+\+)/gm) ?? []).length
  const deletions = (raw.match(/^-(?!--)/gm) ?? []).length
  return { path: relativePath, diff: raw, additions, deletions }
}

export async function sshWorkspacePatch(host: AgentWorkspaceHost, paths?: string[]): Promise<string> {
  const args = ["diff", "HEAD"]
  if (paths && paths.length > 0) args.push("--", ...paths)
  const res = await sshGit(host, args)
  return res.stdout.trim()
}

export async function sshWorkspaceStage(
  host: AgentWorkspaceHost,
  remoteRoot: string,
  paths: string[],
  action: "add" | "unstage"
): Promise<{ ok: true; count: number }> {
  const jailed = paths.map((path) => toRemoteRelative(remoteRoot, resolveRemoteJail(remoteRoot, path)))
  const status = await sshGit(host, ["status", "--porcelain", "--untracked-files=all"])
  if (status.exitCode !== 0) throw new Error(status.stderr || "git stage failed")
  const rows = changesFromGitStatus(status.stdout).map((row) => ({ path: row.path, staged: row.staged }))
  const targets = expandStageTargets(jailed, rows, action)
  if (targets.length === 0) throw new Error("STAGE_NOTHING_MATCHED")
  const res = await sshGit(host, stageGitArgs(action, targets))
  if (res.exitCode !== 0) throw new Error(res.stderr || "git stage failed")
  return { ok: true, count: targets.length }
}

export async function sshWorkspaceRestore(
  host: AgentWorkspaceHost,
  remoteRoot: string,
  paths: string[]
): Promise<{ ok: true; restored: number }> {
  const jailed = paths.map((path) => toRemoteRelative(remoteRoot, resolveRemoteJail(remoteRoot, path)))
  const res = await sshGit(host, ["restore", "--source=HEAD", "--staged", "--worktree", "--", ...jailed])
  if (res.exitCode !== 0) throw new Error(res.stderr || "git restore failed")
  return { ok: true, restored: jailed.length }
}

export async function sshWorkspaceMove(
  host: AgentWorkspaceHost,
  remoteRoot: string,
  from: string,
  toDir: string
): Promise<{ ok: true; from: string; to: string }> {
  const src = toRemoteRelative(remoteRoot, resolveRemoteJail(remoteRoot, from))
  const dir = toRemoteRelative(remoteRoot, resolveRemoteJail(remoteRoot, toDir))
  const planned = planWorkspaceMove(src, dir)
  const destAbs = resolveRemoteJail(remoteRoot, planned.dest)
  const srcAbs = resolveRemoteJail(remoteRoot, src)
  const destDirAbs = resolveRemoteJail(remoteRoot, dir)
  const res = await host.bash(
    `mkdir -p ${quoteRemote(destDirAbs)} && mv ${quoteRemote(srcAbs)} ${quoteRemote(destAbs)}`
  )
  if (res.exitCode !== 0) throw new Error(res.stderr || "REMOTE_MOVE_FAILED")
  return { ok: true, from: src, to: planned.dest }
}

export async function sshWorkspaceBranches(host: AgentWorkspaceHost): Promise<GitBranchesResult> {
  const current = (await sshGit(host, ["branch", "--show-current"])).stdout.trim()
  const listed = await sshGit(host, ["branch", "--list"])
  const branches = parseBranchList(listed.stdout, current)
  if (current && !branches.some((row) => row.name === current)) {
    branches.unshift({ name: current, current: true })
  }
  return { current, branches }
}

export async function sshWorkspaceSwitch(
  host: AgentWorkspaceHost,
  name: string
): Promise<GitSwitchResult> {
  const safe = assertGitBranchName(name)
  const dirty = (await sshGit(host, ["status", "--porcelain"])).stdout.trim()
  if (dirty) {
    return { ok: false, branch: "", code: "GIT_SWITCH_DIRTY", error: "Working tree has uncommitted changes." }
  }
  const switched = await sshGit(host, ["switch", safe])
  if (switched.exitCode !== 0) {
    const fallback = await sshGit(host, ["checkout", safe])
    if (fallback.exitCode !== 0) {
      return {
        ok: false,
        branch: "",
        code: "GIT_SWITCH_FAILED",
        error: fallback.stderr || switched.stderr || "git switch failed"
      }
    }
  }
  const current = (await sshGit(host, ["branch", "--show-current"])).stdout.trim()
  return { ok: true, branch: current }
}


