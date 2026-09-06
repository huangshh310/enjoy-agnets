/**
 * 从 models.list 结果里挑当前模型。
 * 列表为空时返回 undefined，不要用 DeepSeek 预设顶上。
 */
export function pickActiveModel<T extends { id: string }>(
  models: readonly T[],
  currentId: string,
  preferredId?: string | null
): T | undefined {
  if (models.length === 0) return undefined
  const current = models.find((model) => model.id === currentId)
  if (current) return current
  if (preferredId) {
    const preferred = models.find((model) => model.id === preferredId)
    if (preferred) return preferred
  }
  return models[0]
}
