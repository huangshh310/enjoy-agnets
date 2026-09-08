/**
 * Git 技能源计数与可选更新结果。
 * 没有 Git 源时不渲染更新按钮；结果只分「更新了 N 个」/「有源未更新」。
 */
export const SKILL_SOURCES_OVERVIEW_QUERY_KEY = ["skills-sources-overview"] as const

export function countGitSkillSources(sources: ReadonlyArray<{ kind: string }>): number {
  return sources.filter((source) => source.kind === "git").length
}

export function pullToastKind(result: {
  updatedCount: number
  errors: readonly string[]
} | null): "updated" | "missed" {
  if (!result || result.errors.length > 0 || result.updatedCount === 0) return "missed"
  return "updated"
}
