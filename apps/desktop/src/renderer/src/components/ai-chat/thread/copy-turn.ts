/**
 * 复制本轮：有正文抄正文，没有再抄 prompt / 找图片资产。
 */
import { fallbackText } from "../../../hooks/turn-text.ts"

export type CopyableTurn = {
  content: string
  assets?: Array<{ assetId: string; mediaType: string; name: string }>
}

export function textToCopy(message: CopyableTurn, prompt?: string) {
  return fallbackText(message.content, prompt)
}

export function firstImageAsset(message: CopyableTurn) {
  return message.assets?.find((asset) => asset.mediaType.startsWith("image/"))
}
