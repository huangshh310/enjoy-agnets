/**
 * P0-S 芯片文案：有启用才画「扩展 · MCP n · Skills m」。0 的一侧不写。
 * 不依赖 view.ts，单测不必拉 runtime-capabilities。
 */

export type HostInjectChipLane = "both" | "mcp" | "skills"

export function hostInjectChipLane(mcp: number, skills: number): HostInjectChipLane | null {
  if (mcp > 0 && skills > 0) return "both"
  if (mcp > 0) return "mcp"
  if (skills > 0) return "skills"
  return null
}

/** SoT 已启用数：快照与当前引擎一致时信快照，否则信查询。 */
export function hostInjectEnabledCounts(input: {
  snapshotEnabledMcp?: number
  snapshotEnabledSkills?: number
  queryMcp: number
  querySkills: number
  sameRuntime: boolean
}): { mcp: number; skills: number } {
  if (input.sameRuntime) {
    return {
      mcp: input.snapshotEnabledMcp ?? input.queryMcp,
      skills: input.snapshotEnabledSkills ?? input.querySkills
    }
  }
  return { mcp: input.queryMcp, skills: input.querySkills }
}
