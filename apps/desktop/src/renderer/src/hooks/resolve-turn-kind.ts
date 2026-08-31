/**
 * 本轮跑的是 Agent 还是生图：看消息上的 runKind，不要看当前 picker。
 */
import type { ComposerRunKind } from "./composer-run-kind.ts"

export type TurnKindInput = {
  runKind?: ComposerRunKind
  content: string
  assets?: Array<{ mediaType: string }>
  tools?: unknown[]
}

export function resolveTurnKind(message: TurnKindInput): ComposerRunKind {
  if (message.runKind) return message.runKind
  if (message.tools?.length || message.content.trim()) return "agent"
  if (message.assets?.some((asset) => asset.mediaType.startsWith("video/"))) return "video"
  if (message.assets?.some((asset) => asset.mediaType.startsWith("image/"))) return "image"
  return "agent"
}
