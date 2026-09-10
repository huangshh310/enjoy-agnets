/**
 * Agent git_log 条数钳制。host 与工具 schema 共用，防止模型传 0 / 负数 / 过大 limit。
 */
export const GIT_LOG_DEFAULT_LIMIT = 20
export const GIT_LOG_MAX_LIMIT = 100

/** 非法或缺省回落 20；截断到 [1, 100]。 */
export function clampGitLogLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return GIT_LOG_DEFAULT_LIMIT
  return Math.min(GIT_LOG_MAX_LIMIT, Math.max(1, Math.trunc(limit)))
}
