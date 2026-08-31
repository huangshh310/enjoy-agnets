/**
 * embedding 模型漂移：已存 model_id 与当前不一致则需要重嵌。
 */

export function embeddingsNeedRebuild(storedModelIds: string[], currentModelId: string): boolean {
  if (storedModelIds.length === 0) return false
  return storedModelIds.some((id) => id !== currentModelId)
}
