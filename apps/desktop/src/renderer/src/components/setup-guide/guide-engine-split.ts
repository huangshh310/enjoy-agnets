/**
 * 向导引擎步只先露常见 3–4 个，其余收进「更多引擎」。
 */
export const GUIDE_ENGINE_PINNED = ["enjoy-local", "claude", "cursor", "codex"] as const

export function splitGuideEngines<T extends { id: string }>(tools: readonly T[]): {
  pinned: T[]
  more: T[]
} {
  const byId = new Map(tools.map((tool) => [tool.id, tool]))
  const pinned = GUIDE_ENGINE_PINNED.map((id) => byId.get(id)).filter((tool): tool is T => Boolean(tool))
  const pinnedIds = new Set(pinned.map((tool) => tool.id))
  return { pinned, more: tools.filter((tool) => !pinnedIds.has(tool.id)) }
}
