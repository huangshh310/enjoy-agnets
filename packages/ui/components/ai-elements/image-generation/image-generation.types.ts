/**
 * BeUI Image Generation 状态面：抄交互，皮走 BoardUI token。
 */
import type { CSSProperties, ReactNode } from "react"
import { uiT } from "@/i18n/ui-locale"

export type ImageGenerationStatus =
  | "queued"
  | "generating"
  | "refining"
  | "complete"
  | "error"

export type ImageGenerationProps = {
  children?: ReactNode
  status?: ImageGenerationStatus
  label?: string
  prompt?: string
  resolution?: string
  aspectRatio?: CSSProperties["aspectRatio"]
  size?: "compact" | "fluid"
  interactive?: boolean
  statusText?: string
  showStatus?: boolean
  onRetry?: () => void
  className?: string
  mediaClassName?: string
  statusClassName?: string
}

/** 生图状态默认文案，随 setUiLocale 切换。 */
export function STATUS_TEXT(status: ImageGenerationStatus): string {
  switch (status) {
    case "queued":
      return uiT("等待生成", "Waiting to generate")
    case "generating":
      return uiT("正在生成图片", "Generating image")
    case "refining":
      return uiT("正在细化细节", "Refining details")
    case "complete":
      return uiT("图片已就绪", "Image ready")
    case "error":
      return uiT("生成失败", "Generation failed")
  }
}

export const MEDIA_STATE: Record<
  ImageGenerationStatus,
  { filter: string; opacity: number; scale: number }
> = {
  queued: { filter: "blur(4px) saturate(0.75)", opacity: 0, scale: 1.02 },
  generating: { filter: "blur(3px) saturate(0.85)", opacity: 0, scale: 1.015 },
  refining: { filter: "blur(1.5px) saturate(0.95)", opacity: 0.62, scale: 1.005 },
  complete: { filter: "blur(0px) saturate(1)", opacity: 1, scale: 1 },
  error: { filter: "blur(2px) saturate(0.5)", opacity: 0.28, scale: 1 }
}

export type ImageGenerationFrameProps = {
  children?: ImageGenerationProps["children"]
  label: string
  aspectRatio: ImageGenerationProps["aspectRatio"]
  reduce: boolean
  mediaState: (typeof MEDIA_STATE)[keyof typeof MEDIA_STATE]
  mediaClassName?: string
  active: boolean
  interactive: boolean
  status: ImageGenerationStatus
  resolution?: string
}

export const OVERLAY_OPACITY: Record<ImageGenerationStatus, number> = {
  queued: 1,
  generating: 1,
  refining: 0.48,
  complete: 0,
  error: 0
}
