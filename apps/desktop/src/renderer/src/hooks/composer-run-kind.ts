/**
 * Composer 按模型分流：imagine / dall-e 走 SDK generateImage，其余走 Agent ToolLoop。
 */
import { isImageOnlyModelId, isVideoOnlyModelId } from "@enjoy-agents/providers/capabilities"
import type { AssistantRunKind } from "@enjoy-agents/ipc-contract"

export type ComposerRunKind = AssistantRunKind

export function composerRunKind(modelId: string, capabilities?: string[]): ComposerRunKind {
  if (isVideoOnlyModelId(modelId)) return "video"
  if (isImageOnlyModelId(modelId)) return "image"
  const caps = capabilities ?? []
  if (caps.includes("image") && !caps.includes("text") && !caps.includes("tools")) return "image"
  if (caps.includes("video") && !caps.includes("text") && !caps.includes("tools")) return "video"
  return "agent"
}
