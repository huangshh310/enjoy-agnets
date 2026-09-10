/**
 * Agent git_log 的 porcelain 参数。线性 oneline，不是 Review 栏 structured log。
 * 条数钳制与 agent-core `clampGitLogLimit` 同规则（默认 20、上限 100）。
 * 本文件不 import agent-core 桶入口：node:test 解析不到无 .ts 的 `./agent`。
 */

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

function clampLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return DEFAULT_LIMIT
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(limit)))
}

/** 拼 `git log` 参数；path 已由调用方 jail。 */
export function gitLogCommandArgs(options?: { limit?: number; path?: string }): string[] {
  const args = [
    "log",
    `--max-count=${clampLimit(options?.limit)}`,
    "--pretty=format:%h %ad %an %s",
    "--date=short"
  ]
  const path = options?.path?.trim()
  if (path) args.push("--", path)
  return args
}
