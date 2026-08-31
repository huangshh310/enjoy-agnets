/**
 * Composer 按模型分流：imagine / dall-e 走 SDK generateImage，其余走 Agent ToolLoop。
 */

export type ComposerRunKind = "agent" | "image" | "video"

export function composerRunKind(modelId: string, capabilities?: string[]): ComposerRunKind {
  const id = modelId.toLowerCase()
  if (/imagine-video|sora|kling/.test(id)) return "video"
  if (/imagine-image|dall-e|gpt-image|flux|sdxl|image-edit|image-lite/.test(id)) return "image"
  const caps = capabilities ?? []
  if (caps.includes("image") && !caps.includes("text") && !caps.includes("tools")) return "image"
  if (caps.includes("video") && !caps.includes("text") && !caps.includes("tools")) return "video"
  return "agent"
}
