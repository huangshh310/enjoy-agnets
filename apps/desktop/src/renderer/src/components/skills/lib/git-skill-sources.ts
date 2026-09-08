/**
 * Git 技能源计数与会话前可选拉取门闩。
 * 没有 Git 源时不展示拉取入口，避免空操作。
 */
export const SKILL_SOURCES_OVERVIEW_QUERY_KEY = ["skills-sources-overview"] as const

export function countGitSkillSources(sources: ReadonlyArray<{ kind: string }>): number {
  return sources.filter((source) => source.kind === "git").length
}

/** 新会话条：有 Git 源、本会话未跳过、尚未拉过才出现。 */
export function shouldOfferSkillSourcePull(input: {
  gitCount: number
  dismissed: boolean
  pulled: boolean
}): boolean {
  return input.gitCount > 0 && !input.dismissed && !input.pulled
}

export function summarizePullResult(result: {
  updatedCount: number
  errors: readonly string[]
}): "ok" | "partial" | "empty" {
  if (result.errors.length > 0) return "partial"
  if (result.updatedCount === 0) return "empty"
  return "ok"
}
