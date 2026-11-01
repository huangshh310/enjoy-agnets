/**
 * 工作区 git 近期改动粗估：`git log --name-only`。可注入，单测不依赖远端。
 */
import { spawn } from "node:child_process"
import { scoresFromNameOnlyLog } from "./relevance.ts"

/** 默认真近提交扫描上限（可配置）。 */
export const REPO_MAP_GIT_LOG_LIMIT = 40

export type LoadRecentChangeScores = (
  paths: readonly string[]
) => Promise<Map<string, number>>

/**
 * 用 `git -C root log --name-only --pretty=format: -n N` 统计 paths 近期出现次数。
 * 非 git / 失败 → 空 Map（调用方可再退 mtime）。
 */
export function createGitRecentChangeLoader(
  workspaceRoot: string,
  options?: { limit?: number; runGit?: typeof runGitNameOnlyLog }
): LoadRecentChangeScores {
  const limit = options?.limit ?? REPO_MAP_GIT_LOG_LIMIT
  const runGit = options?.runGit ?? runGitNameOnlyLog
  return async (paths) => {
    if (paths.length === 0) return new Map()
    try {
      const stdout = await runGit(workspaceRoot, limit)
      return scoresFromNameOnlyLog(stdout, paths)
    } catch {
      return new Map()
    }
  }
}

/** 无 git 时按 mtime 给弱信号：越新分越高（相对排序用）。 */
export function mtimeChangeScores(
  mtimes: ReadonlyMap<string, number> | Record<string, number>
): Map<string, number> {
  const entries =
    mtimes instanceof Map ? [...mtimes.entries()] : Object.entries(mtimes)
  if (entries.length === 0) return new Map()
  const sorted = [...entries].sort((a, b) => b[1] - a[1])
  const out = new Map<string, number>()
  // 线性衰减：最新 = n，最旧 = 1
  const n = sorted.length
  sorted.forEach(([path], index) => {
    out.set(path, n - index)
  })
  return out
}

export function runGitNameOnlyLog(workspaceRoot: string, limit: number): Promise<string> {
  const max = Math.max(1, Math.min(100, Math.floor(limit)))
  return new Promise((resolve, reject) => {
    const child = spawn(
      "git",
      ["-C", workspaceRoot, "log", "--name-only", "--pretty=format:", `-n${max}`],
      { stdio: ["ignore", "pipe", "pipe"] }
    )
    let stdout = ""
    let stderr = ""
    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk
    })
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk
    })
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) resolve(stdout)
      else reject(new Error(stderr.trim() || `git log exit ${code}`))
    })
  })
}
