/**
 * Extract 用哪段文本、哪个聊天模型：生图轮正文为空，imagine 也不能跑 structured-object。
 */
import { composerRunKind } from "./composer-run-kind.ts"
import { fallbackText } from "./turn-text.ts"

export function extractSourceText(content: string, fallback?: string) {
  return fallbackText(content, fallback)
}

export function pickExtractModelId(
  currentId: string,
  models: Array<{ id: string; capabilities?: string[] }>
) {
  const current = models.find((model) => model.id === currentId)
  if (composerRunKind(currentId, current?.capabilities) === "agent") return currentId
  return models.find((model) => composerRunKind(model.id, model.capabilities) === "agent")?.id
}
