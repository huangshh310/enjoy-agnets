/**
 * 画布节点对 ai.generate 事件的归约。
 * 媒体 kind 必须以 asset.created 为成功；run.end 时还在 loading 就是没产出。
 */
export type CanvasGenKind = "image" | "video" | "speech" | "text"

export type CanvasGenPatch = {
  status: "loading" | "success" | "error"
  errorDetails?: string
  assetId?: string
  mediaType?: string
}

export function applyCanvasGenerationEvent(
  currentStatus: string | undefined,
  kind: CanvasGenKind,
  event: { type?: string; message?: string; assetId?: string; mediaType?: string }
): CanvasGenPatch | null {
  if (event.type === "asset.created" && event.assetId) {
    return {
      status: "success",
      assetId: event.assetId,
      mediaType: event.mediaType,
      errorDetails: undefined
    }
  }
  if (event.type === "run.error") {
    return {
      status: "error",
      errorDetails: event.message?.trim() || "Generation failed."
    }
  }
  if (event.type === "run.end" && currentStatus === "loading") {
    if (kind === "text") return { status: "success", errorDetails: undefined }
    return {
      status: "error",
      errorDetails: event.message?.trim() || "Image provider returned no bytes."
    }
  }
  return null
}
