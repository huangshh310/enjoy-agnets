/**
 * 生视频表面：抄生图 dither 交互，16:9 画布，状态行换「Generating video」。
 */
import type { ReactNode } from "react"
import { ImageGeneration } from "@/components/ai-elements/image-generation"

export function VideoGeneration({
  status = "generating",
  prompt,
  children
}: {
  status?: "generating" | "complete"
  prompt?: string
  children?: ReactNode
}) {
  return (
    <ImageGeneration
      status={status}
      prompt={prompt}
      aspectRatio="16 / 9"
      label={status === "complete" ? "Generated video" : "Generating video"}
      statusText={status === "complete" ? "Video ready" : "Generating video"}
      showStatus
      size="fluid"
      className="w-80 max-w-full"
    >
      {children}
    </ImageGeneration>
  )
}
