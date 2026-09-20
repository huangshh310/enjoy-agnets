/**
 * 精选卡是否已写入 Enjoy SoT。权威仍是 #/mcp / #/skills，不是精选列表。
 */

export function isMcpWritten(
  servers: ReadonlyArray<{ name: string }>,
  card: { id: string; title: string }
): boolean {
  const id = card.id.trim().toLowerCase()
  const title = card.title.trim().toLowerCase()
  return servers.some((server) => {
    const name = server.name.trim().toLowerCase()
    return name === id || name === title
  })
}

/** locator `owner/repo` 与 addGitSource 的 sourceId `owner-repo` 对齐。 */
export function skillSourceIdFromLocator(locator: string): string {
  return locator.trim().replace("/", "-").toLowerCase()
}

export function isSkillWritten(
  sources: ReadonlyArray<{ id: string; name: string; origin: string }>,
  card: { id: string; locator?: string; sourceName?: string; title: string }
): boolean {
  const locator = (card.locator ?? "").trim().toLowerCase()
  const sourceId = locator ? skillSourceIdFromLocator(locator) : card.id.trim().toLowerCase()
  const names = new Set(
    [card.sourceName, card.title, card.id].map((value) => value?.trim().toLowerCase()).filter(Boolean)
  )
  return sources.some((source) => {
    const origin = source.origin.toLowerCase()
    const id = source.id.toLowerCase()
    const name = source.name.toLowerCase()
    if (id === sourceId) return true
    if (locator && (origin.includes(locator) || id.includes(locator.replace("/", "-")))) return true
    return names.has(name)
  })
}

export function configuredNames(items: ReadonlyArray<{ name?: string }>, limit = 6): string[] {
  return items.flatMap((item) => {
    const name = item.name?.trim()
    return name ? [name] : []
  }).slice(0, limit)
}
