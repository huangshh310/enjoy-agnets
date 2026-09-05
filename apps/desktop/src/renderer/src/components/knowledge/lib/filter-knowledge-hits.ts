/**
 * P1 检索范围：IPC 暂无 sourceIds 时，按启用透镜 / 当前路径在前端收窄命中。
 */

export type KnowledgeHitFilterItem = {
  sourceId: string
  path: string
}

export function filterKnowledgeHits<T extends KnowledgeHitFilterItem>(
  hits: T[],
  input: { enabledSourceIds: readonly string[]; selectedPath?: string | null }
): T[] {
  const enabled = new Set(input.enabledSourceIds)
  const selected = input.selectedPath?.trim() || null
  const selectedNorm = selected?.replaceAll("\\", "/") ?? null

  return hits.filter((hit) => {
    if (!enabled.has(hit.sourceId)) return false
    if (!selectedNorm) return true
    const path = hit.path.replaceAll("\\", "/")
    return path === selectedNorm || path.startsWith(`${selectedNorm}/`)
  })
}

export function resolveEnabledSourceIds(
  lenses: Array<{ id: string; path: string; enabled: boolean }>,
  selectedFolder: string | null
): string[] {
  if (selectedFolder) {
    const selected = selectedFolder.replaceAll("\\", "/")
    return lenses
      .filter((lens) => {
        const path = lens.path.replaceAll("\\", "/")
        return path === selected || path.startsWith(`${selected}/`) || selected.startsWith(`${path}/`)
      })
      .map((lens) => lens.id)
  }
  return lenses.filter((lens) => lens.enabled).map((lens) => lens.id)
}
