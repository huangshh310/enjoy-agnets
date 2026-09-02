/**
 * 生视频表面：抄生图 dither 交互，16:9 画布，状态行换「Generating video」。
 */
import type { ReactNode } from "react"
import { ImageGeneration } from "@/components/ai-elements/image-generation"
import { useT } from "@renderer/i18n"


export function VideoGeneration({
  status = "generating",
  prompt,
  children
}: {
  status?: "generating" | "complete"
  prompt?: string
  children?: ReactNode
}) {
  const t = useT()
  return (
    <ImageGeneration
      status={status}
      prompt={prompt}
      aspectRatio="16 / 9"
      label={status === "complete" ? t("chat.generatedVideo") : t("chat.generatingVideo")}
      statusText={status === "complete" ? t("chat.videoReady") : t("chat.generatingVideo")}
      showStatus
      size="fluid"
      className="w-80 max-w-full"
    >
      {children}
    </ImageGeneration>
  )
}
